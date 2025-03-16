import * as cheerio from 'cheerio'
import { HEADERS } from '../_data_/headers/headers.js'
import { logger } from '../loggers/logger.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { USER_MODEL } from '../models/user.js'
import axiosInstance from '../utils/proxy.js'
import { validateEndpointDomain } from '../utils/validateBaseUrl.js'

export async function generateExpediaProfile (req, res) {
  try {
    const frontFacingUrl = req.body.frontFacingUrl
    const isValid = validateEndpointDomain(frontFacingUrl, req)
    if (!isValid)
      return res.status(400).json('Error: Bad request - Invalid baseUrl!')

    const { email, isAdmin, userId } = await req.locals.user
    if (isAdmin) {
      const user = await USER_MODEL.findOne({ email })
      if (!user) return res.status(404).json('User not found!')

      const isSubscribed = await USER_MODEL.getSubscriptionStatus(userId)
      if (!isSubscribed)
        return res.status(400).json({
          status: 'failed',
          message:
            'user is unsubscribed - review profile creation requires active subscription'
        })

      const response = await axiosInstance.get(frontFacingUrl, {
        headers: HEADERS.expediaHeadersGenProfile
      })

      const expediaHtmlContent = response.data
      const $ = cheerio.load(expediaHtmlContent)

      const hotelIDextract = $('link[rel="canonical"]').attr('href')
      const hotelId1 = extractHotelID(hotelIDextract)
      const hotelId2 = $('meta[itemProp="identifier"]').attr('content')
      const hotelId = (hotelId1 && hotelId1) || (hotelId2 && hotelId2) || null
      if (!hotelId)
        return res.status(404).json({ failed: true, response: response.data })

      const mainUrl = hotelIDextract
      const updatedFrontfacingUrl = mainUrl || req.url

      const expediaCrawlerUrl = 'https://www.expedia.com/graphql'

      const hotelName1 = $('h1.uitk-heading').text().trim()
      const hotelName2 = extractData(updatedFrontfacingUrl, /com\/(.*?)\.h/)
      const hotelName =
        (hotelName1 && hotelName1) || (hotelName2 && hotelName2) || null

      const allEndpoints = extractAlternateLinks($)

      const prop_type = extractData(
        updatedFrontfacingUrl,
        /h\d+\.([^-]+)-Information/
      )
      prop_type?.toLowerCase()

      const review_count1 = extractTotalFromSelector(
        $,
        'button[data-stid="reviews-link"]',
        /See\s*all\s*(\d+)\s*reviews/
      )
      const review_count2 = extractStringFromHTML(
        $,
        /\"See\s*all\s*(\d+)\s*reviews\"/
      )

      const reviewCount =
        (review_count1 && review_count1) ||
        (review_count2 && review_count2) ||
        null

      const propertyAddress1 = $('meta[itemProp="streetAddress"]').attr(
        'content'
      )
      const postal_code = $('meta[itemProp="postalCode"]').attr('content')
      const region = $('meta[itemProp="addressRegion"]').attr('content')
      const country = $('meta[itemProp="addressCountry"]').attr('content')
      const locality = $('meta[itemProp="addressLocality"]').attr('content')

      const propertyAddress2 = [propertyAddress1, locality, region, postal_code]
        .filter(Boolean)
        .join(', ')
      const propertyAddress = propertyAddress2 || propertyAddress1 || null

      const latitude = $('meta[itemProp="latitude"]').attr('content')
      const longitude = $('meta[itemProp="longitude"]').attr('content')
      const description = $('meta[itemProp="description"]').attr('content')
      const star_rating1 = extractStringFromHTML(
        $,
        /<span\s+class="is-visually-hidden">([\d.]+)\s+out\s+of\s+/
      )

      const star_rating2 = extractStringFromHTML($, /'>(.*)\s*out\s*of\s*'/)
      const starRating =
        (star_rating1 && star_rating1) || (star_rating2 && star_rating2) || null

      const locale = $('html').attr('data-language')

      const duaid1 = $('span[id="DeviceId"]').text().trim()
      const duaid2 = extractStringFromHTML($, /"duaid":"(.*?)"/)
      const duaid_extract = $('a[data-stid="landing-link-2-link"]').attr('href')
      const duaid3 = extractData(duaid_extract, /duaid=([a-f0-9\-]+)/)
      const duaid = duaid1 || duaid2 || duaid3 || null

      const regionalI1 = extractStringFromHTML($, /"regionalId":"(.*?)"/)
      const regionalId2 = extractStringFromHTML($, /\?regionId=(\d+)&/)
      const regionalId3 = extractStringFromHTML($, /\?regionId=(\d+)&amp/)

      const regionalId =
        (regionalI1 && regionalI1) ||
        (regionalId2 && regionalId2) ||
        (regionalId3 && regionalId3) ||
        null

      const metadata = {}
      metadata.propertyAddress = propertyAddress || null
      metadata.starRating = starRating || null
      metadata.propertyDescription = description || null
      metadata.latitude = latitude || null
      metadata.longitude = longitude || null
      metadata.locale = locale || null
      metadata.regionalId = regionalId
      metadata.duaid = duaid

      const existingProfile = await PROFILE_MODEL.findOne(
        {
          reviewSiteSlug: 'expedia-com',
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
          existingProfile.originalUrl = updatedFrontfacingUrl
          existingProfile.url = expediaCrawlerUrl
          existingProfile.propertyEndpoints = allEndpoints
          existingProfile.propertyType = prop_type
          existingProfile.computedUrl = updatedFrontfacingUrl
          existingProfile.reviewPageUrl = updatedFrontfacingUrl

          await existingProfile.save()

          await USER_MODEL.setSubStatus(user, true)
          return res.status(200).json(existingProfile)
        }

        return res.status(400).json({
          status: 'failed',
          message: 'Account already has a expedia-com profile',
          profile: existingProfile
        })
      }

      // Create new profile if no existing document
      const siteProfileData = await PROFILE_MODEL.create({
        reviewSiteSlug: 'expedia-com',
        originalUrl: updatedFrontfacingUrl,
        url: expediaCrawlerUrl,
        userId: user.userId,
        metadata: metadata,
        propertyReviewCount: reviewCount,
        propertyExternalId: hotelId,
        propertyEndpoints: allEndpoints,
        propertyType: prop_type,
        reviewPageUrl: expediaCrawlerUrl,
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
function extractData (str, regex) {
  const match = str && str.match(regex)
  return match ? match[1].replace(/_/g, ' ') : null
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
const extractHotelID = url => {
  const match = url.match(/\.h(\d+)\.Hotel/)
  return match ? match[1] : null
}
function extractTotalFromSelector ($, selector, regex) {
  const text = $(selector).text().trim()
  const match = text.match(regex)
  return match ? match[1] : null
}
function extractStringFromHTML ($, regex) {
  const htmlString = $.html()
  const match = htmlString.match(regex)
  return match ? match[1] : null
}
