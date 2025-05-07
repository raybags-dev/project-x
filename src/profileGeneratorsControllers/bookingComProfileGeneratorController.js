import * as cheerio from 'cheerio'
import { HEADERS } from '../data/headers/headers.js'
import { logger } from '../loggers/logger.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { USER_MODEL } from '../models/user.js'
import { validateResponse } from '../utilities/generalUtilities.js'
import { validateAndAuthorizeUser } from '../utilities/utilities.js'

import axiosInstance from '../downloader/HTTPEngine.js'

export async function generateBookingComProfile (req, res) {
  try {
    const validation = await validateAndAuthorizeUser(req, res)
    if (validation.error) return

    const { frontFacingUrl, user } = validation

    const headers = HEADERS.bookingHeadersGenProfile
    const response = await axiosInstance.get(frontFacingUrl, { headers })

    if (!validateResponse(response)) return

    const bookingHtmlContent = response.data
    const $ = cheerio.load(bookingHtmlContent)

    const hotelID1 = $('input[name="hotel_id"]').attr('value')
    const altId = $('link[rel="alternate"]').attr('href')
    const hotelIDMatch =
      /android-app:\/\/com\.booking\/booking\/hotel\/(\d+)/.exec(altId)
    const hotelID2 = hotelIDMatch ? hotelIDMatch[1] : null
    const hotelId = (hotelID1 && hotelID1) || hotelID2

    if (!hotelId)
      return res.status(404).json({ failed: true, response: response.data })

    const mainUrl1 = $(
      'a[data-testid="breadcrumb-link"][aria-current="page"]'
    ).attr('href')
    const mainUrl2 = $('link[rel="canonical"]').attr('href')
    const mainUrl3 = $('meta[property="og:url"]').attr('content')

    const mainUrl4Regexp = /"url"\s*:\s*"([^"]+)"/
    const mainUrl4 = (mainUrl4Regexp[1] && mainUrl4Regexp[1]) || null

    const updatedFrontfacingUrl = extractMainReviewUrl(
      mainUrl1,
      mainUrl2,
      mainUrl3,
      mainUrl4
    )
    const bookingCrawlerUrl = buildBackendUrl(updatedFrontfacingUrl)

    const hotelName1 = $('h2.pp-header__title').text().trim()
    const hotelName2 = getScriptData($, /"name"\s*:\s*"([^"]+)"/)
    const hotelName3 = $('meta[name="twitter:title"]').attr('content')
    const hotelName_extract = $(
      'a.bui_breadcrumb__link_masked[itemprop="item"]'
    )
      .text()
      .trim()
    const hotelName4 = extractData(hotelName_extract, /^(.*?)\(/)

    const hotelName =
      (hotelName1 && hotelName1) ||
      (hotelName2 && hotelName2) ||
      (hotelName3 && hotelName3) ||
      (hotelName4 && hotelName4)

    const allEndpoints = extractAlternateLinks($)

    const property_type = extractData(hotelName_extract, /\(([^)]+)\)/)
    property_type?.toLowerCase()

    const review_count = getScriptData($, /"reviewCount"\s*:\s*([\d]+),/)
    const reviewCount = review_count || null

    const metadata = {}

    const dest_ufi1 = getScriptData($, /dest_ufi:\s*['"]?-?(\d+)['"]?,/)
    const ufi_extract = $('input[name="dest_id"]').attr('value')
    const dest_ufi2 = ufi_extract ? ufi_extract.replace(/\D/g, '') : null
    const dest_ufi = dest_ufi1 || dest_ufi2 || null

    const code_default = extractData(
      updatedFrontfacingUrl,
      /\/hotel\/([^/]+)\//
    )
    const code_altString = $('link[rel="canonical"]').attr('href')
    const code_alt1Match = code_altString.match(/hotel\/([a-z]{2})\//)
    const code_alt2 = getScriptData($, /b_countrycode"\s*:\s*'([^/]+)'/)
    const code_alt = (code_alt1Match && code_alt1Match[1]) || code_alt2 || null

    const rating1 = getScriptData($, /"ratingValue"\s*:\s*(\d+(\.\d+)?)/)
    const rating2 = getScriptData($, /utrs:\s*'([\d.]+)'/)
    const rating = rating1 || rating2 || null

    const dest_type =
      $('input[name="dest_type"]').attr('value')?.toUpperCase() || 'CITY'

    metadata.dest_ufi = dest_ufi
    metadata.countryCode = code_default || code_alt
    metadata.rating = rating
    metadata.dest_type = dest_type
    metadata.review_total = reviewCount
    metadata.property_type = property_type || null

    const existingProfile = await PROFILE_MODEL.findOne(
      {
        reviewSiteSlug: 'booking-com',
        userId: user.userId
      },
      {
        createdTimestamp: 0,
        createdAt: 0,
        updatedAt: 0,
        nextRunType: 0,
        __v: 0
      }
    )

    if (existingProfile) {
      const hasChanges =
        existingProfile.propertyReviewCount !== reviewCount ||
        existingProfile.propertyExternalId !== hotelId ||
        existingProfile.name !== hotelName

      if (hasChanges) {
        existingProfile.propertyReviewCount = reviewCount
        existingProfile.propertyExternalId = hotelId
        existingProfile.name = hotelName
        existingProfile.metadata = metadata
        existingProfile.originalUrl = updatedFrontfacingUrl
        existingProfile.url = bookingCrawlerUrl
        existingProfile.propertyEndpoints = allEndpoints
        existingProfile.propertyType = property_type || 'HOTEL'
        existingProfile.computedUrl = updatedFrontfacingUrl
        existingProfile.reviewPageUrl = bookingCrawlerUrl

        await existingProfile.save()

        await USER_MODEL.setSubStatus(user, true)
        return res.status(200).json(existingProfile)
      }

      return res.status(400).json({
        status: 'failed',
        message:
          'Account already has a booking-com profile with the same values!',
        profile: existingProfile
      })
    }

    // Create new profile if no existing document
    const siteProfileData = await PROFILE_MODEL.create({
      reviewSiteSlug: 'booking-com',
      originalUrl: updatedFrontfacingUrl,
      url: bookingCrawlerUrl,
      userId: user.userId,
      metadata: metadata,
      propertyReviewCount: reviewCount,
      propertyExternalId: hotelId,
      propertyEndpoints: allEndpoints,
      propertyType: property_type || 'HOTEL',
      nextRunType: 'INITIAL',
      reviewPageUrl: bookingCrawlerUrl,
      computedUrl: updatedFrontfacingUrl,
      name: hotelName
    })

    await USER_MODEL.setSubStatus(user, true)
    return res.status(200).json(siteProfileData)
  } catch (error) {
    logger(`failed in <generateBookingComProfile> - ${error}`, 'error')
    res.status(500).json({ status: 'failed', message: 'Internal server error' })
  }
}
function buildBackendUrl (url) {
  try {
    if (!url)
      throw new Error('booking.com Backend endpoint build failed: no URL')

    // Extract label (required)
    const labelMatch = url.match(/(?:\?|&)label=([^&#]+)/)
    if (!labelMatch || !labelMatch[1]) {
      throw new Error(
        'booking.com Backend endpoint build failed: label missing'
      )
    }

    const labelParam = `label=${labelMatch[1]}`

    // Extract sid (optional)
    const sidMatch = url.match(/(?:\?|&)sid=([^&#]+)/)
    const sidParam = sidMatch && sidMatch[1] ? `&sid=${sidMatch[1]}` : ''

    // Build final URL
    return `https://www.booking.com/dml/graphql?${labelParam}${sidParam}&dist=0&keep_landing=1&sb_price_type=total&tab=4&type=total&lang=en-gb`
  } catch (error) {
    logger(`failed in <buildBackendUrl> - ${error.message}`, 'error')
    return null
  }
}
function extractData (str, regex) {
  if (!str || regex) return null
  const match = str.match(regex)
  return match ? match[1] : null
}
function getScriptData ($, regex) {
  if (!$ || !regex) return null
  const scriptContent = $('script')
    .toArray()
    .map(el => $(el).text())
    .find(
      text =>
        text.includes('"name"') &&
        text.includes('"description"') &&
        text.includes('"address"')
    )

  if (!scriptContent) return null

  const match = scriptContent.match(regex)
  return match ? match[1] : null
}
function extractAlternateLinks ($) {
  if (!$) return null
  const linksObj = {}

  $('link[rel="alternate"]').each((i, el) => {
    const lang = $(el).attr('hreflang')
    const url = $(el).attr('href')
    if (lang && url) {
      linksObj[lang] = url
    }
  })

  return linksObj
}
function extractMainReviewUrl (...urls) {
  for (const url of urls) {
    if (typeof url === 'string' && url.trim() !== '') {
      return `${url}#tab-reviews`
    }
  }
  return null
}
