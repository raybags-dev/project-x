import * as cheerio from 'cheerio'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { USER_MODEL } from '../models/user.js'
import { HEADERS } from '../_data_/headers/headers.js'
import { logger } from '../utils/logger.js'
import axiosInstance from '../utils/proxy.js'

export async function generateBookingComProfile (req, res) {
  try {
    const frontFacingUrl = req.body.frontFacingUrl
    if (!frontFacingUrl) return res.status(400).json('bad request')

    const { email, isAdmin, userId } = await req.locals.user
    if (isAdmin) {
      const user = await USER_MODEL.findOne({ email })
      if (!user) return res.status(404).json('User not found!')

      const headers = HEADERS.bookingHeadersGenProfile
      const response = await axiosInstance.get(frontFacingUrl, { headers })
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

      const bookingCrawlerUrl = extractSidValue(mainUrl)

      const hotelName1 = $('h2.pp-header__title').text().trim()
      const hotelName2 = extractDataFromScript($, /"name"\s*:\s*"([^"]+)"/)
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

      const reviewCount = extractDataFromScript(
        $,
        /"reviewCount"\s*:\s*([\d]+),/
      )

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
        return res.status(400).json({
          status: 'failed',
          message: 'Account already has a booking-com profile!',
          profile: existingProfile
        })
      }

      const siteProfileData = await PROFILE_MODEL.create({
        reviewSiteSlug: 'booking-com',
        originalUrl: updatedFrontfacingUrl,
        url: bookingCrawlerUrl,
        userId: user.userId,
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
    }
    res.status(400).json({
      status: 'failed',
      message:
        'Profile could not be saved. Please the property url and try again!'
    })
  } catch (e) {
    logger(e, 'error')
    res.status(500).json({ status: 'failed', message: 'Internal server error' })
  }
}

function extractSidValue (url) {
  const regex = /([?&]label=[^&]+&sid=[^&]+)/
  const match = url.match(regex)

  if (match) {
    return `https://www.booking.com/dml/graphql?${match[1]}&dist=0&keep_landing=1&sb_price_type=total&tab=4&type=total&lang=en-gb`
  } else {
    return null
  }
}
function extractData (str, regex) {
  const match = str.match(regex)
  return match ? match[1] : null
}
function extractDataFromScript ($, regex) {
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
