import * as cheerio from 'cheerio'
import { HEADERS } from '../data/headers/headers.js'
import { logger } from '../loggers/logger.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { USER_MODEL } from '../models/user.js'
import { validateResponse } from '../utils/generalUtilities.js'
import { validateAndAuthorizeUser } from '../utils/utilities.js'

import axiosInstance from '../utils/proxy.js'

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

    const mainUrl = $('a.bui_breadcrumb__link_masked[itemprop="item"]').attr(
      'href'
    )

    const updatedFrontfacingUrl = `http://www.booking.com${
      mainUrl || null
    }#tab-reviews`

    const bookingCrawlerUrl = buildBackendUrl(mainUrl)

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

    const code_default = extractData(mainUrl, /\/hotel\/([^/]+)\//)

    const rating1 = getScriptData($, /"ratingValue"\s*:\s*(\d+(\.\d+)?)/)
    const rating2 = getScriptData($, /utrs:\s*'([\d.]+)'/)
    const rating = rating1 || rating2 || null

    const dest_type =
      $('input[name="dest_type"]').attr('value')?.toUpperCase() || 'CITY'

    metadata.dest_ufi = dest_ufi
    metadata.countryCode = code_default
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
  if (!url) return null

  let match = url.match(/([?&]label=[^&]+&sid=[^&]+)/)
  if (match && match[1]) {
    return `https://www.booking.com/dml/graphql${match[1]}&dist=0&keep_landing=1&sb_price_type=total&tab=4&type=total&lang=en-gb`
  }

  // Fallback attempt: extract just the label (no sid)
  match = url.match(/\?label=[^#&]+/)
  if (match && match[0]) {
    return `https://www.booking.com/dml/graphql${match[0]}&dist=0&keep_landing=1&sb_price_type=total&tab=4&type=total&lang=en-gb`
  }

  return null
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
