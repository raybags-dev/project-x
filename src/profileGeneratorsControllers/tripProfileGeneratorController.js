import * as cheerio from 'cheerio'
import { HEADERS } from '../_data_/headers/headers.js'
import { logger } from '../loggers/logger.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { USER_MODEL } from '../models/user.js'
import axiosInstance from '../utils/proxy.js'
import { validateEndpointDomain } from '../utils/validateBaseUrl.js'

export async function generateTripProfile (req, res) {
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
      const basetripUrl = genbaseTripUrl(frontFacingUrl)

      const response = await axiosInstance.get(basetripUrl, {
        headers: HEADERS.tripHeadersGenProfile
      })

      const tripHtmlContent = response.data
      const $ = cheerio.load(tripHtmlContent)

      const hotelId1 = extractStringFromHTML($, /hotelId=(\d+)/)
      const hotelId2 = extractData(basetripUrl, /hotelId=(\d+)/)

      const hotelId = (hotelId1 && hotelId1) || (hotelId2 && hotelId2) || null
      if (!hotelId)
        return res.status(404).json({ failed: true, response: response.data })

      const updatedFrontfacingUrl = basetripUrl || req.url

      const tripCrawlerUrl =
        'https://us.trip.com/restapi/soa2/28820/ctgetHotelComment'

      const hotelName1 = extractStringFromHTML(
        $,
        /nameLocale\\\":\\\"(.*?)\\\"/
      )
      const hotelName2 = extractStringFromHTML($, /siteName\\\":\\\"(.*?)\\\"/)
      const hotelName =
        (hotelName1 && hotelName1) || (hotelName2 && hotelName2) || null

      const prop_type = extractStringFromHTML(
        $,
        /"structuredData\\\":\[\\\"\{\\\\\\\"@type\\\\\\\":\\\\\\\"(.*?)\\\\\\\"/
      )
      prop_type?.toLowerCase()

      const review_count1 = extractStringFromHTML(
        $,
        /reviewCount\\\\\\\":\\\\\\\"(\d+)\\\\\\\"/
      )
      const review_count2 = extractStringFromHTML($, /All\s*(\d+)\s*Reviews/)
      const review_count3 = extractStringFromHTML($, /totalComment\\\":(\d+)/)

      const reviewCount =
        (review_count1 && review_count1) ||
        (review_count2 && review_count2) ||
        (review_count3 && review_count3) ||
        null

      const propertyAddress = extractStringFromHTML(
        $,
        /"addressLocality\\\\\\\":\\\\\\\"(.*?)\\\\\\\"/
      )
      const region = extractStringFromHTML(
        $,
        /\\\\\\\"addressRegion\\\\\\\":\\\\\\\"(.*?)\\\\\\\"/
      )
      const postal_code = extractStringFromHTML(
        $,
        /\\\\\\\"postalCode\\\\\\\":\\\\\\\"(.*?)\\\\\\\"/
      )
      const street = extractStringFromHTML(
        $,
        /"streetAddress\\\\\\\":\\\\\\\"(.*?)\\\\\\\"/
      )
      const country = extractStringFromHTML(
        $,
        /"addressCountry\\\\\\\":\\\\\\\"(.*?)\\\\\\\"/
      )
      const description = extractStringFromHTML(
        $,
        /",\\\"description\\\":\\\"(.*?)\\\"/
      )
      const star_rating1 = extractStringFromHTML(
        $,
        /"ratingValue\\\\\\\":\\\\\\\"(.*?)\\\\\\\"/
      )
      const star_rating2 = extractStringFromHTML(
        $,
        /\\\"comment\\\":{\\\"score\\\":\\\"(.*?)\\\"/
      )

      const starRating =
        (star_rating1 && star_rating1) || (star_rating2 && star_rating2) || null

      const locale = $('html').attr('lang')

      const cid = extractStringFromHTML($, /divisionID\\\":\\\"(.*?)\\\"/)
      const aid = extractStringFromHTML($, /allianceid\\\":\\\"(.*?)\\\"/)
      const ouid = extractStringFromHTML($, /(?<=OUID=)([^&]+)/)

      const sid1 = extractStringFromHTML($, /sid\\\":\\\"(.*?)\\\"/)
      const sid2 = extractStringFromHTML($, /(?<=SID=)([^&]+)/)
      const sid = (sid1 && sid1) || (sid2 && sid2) || null

      const pageId = extractStringFromHTML($, /pageId\\\":\\\"(.*?)\\\"/)

      const vid1 = extractStringFromHTML($, /UBT_VID\":\"(.*?)\"/)
      const vid2 = extractStringFromHTML($, /"vid\\\":\\\"(.*?)\\\"/)
      const vid = (vid1 && vid1) || (vid2 && vid2) || null

      const metadata = {}
      metadata.propertyAddress = propertyAddress || null
      metadata.starRating = starRating || null
      metadata.propertyDescription = description || null
      metadata.locale = locale || null
      metadata.region = region || null
      metadata.postal_code = postal_code || null
      metadata.street = street || null
      metadata.country = country || null
      metadata.cid = cid || null
      metadata.aid = aid || null
      metadata.ouid = ouid || null
      metadata.sid = sid || null
      metadata.pageId = pageId || null
      metadata.vid = vid || null
      metadata.ctripUrl = `https://hotels.ctrip.com/hotels/${hotelId}.html`

      const existingProfile = await PROFILE_MODEL.findOne(
        {
          reviewSiteSlug: 'trip-com',
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
          existingProfile.url = tripCrawlerUrl
          existingProfile.propertyType = prop_type
          existingProfile.computedUrl = updatedFrontfacingUrl
          existingProfile.reviewPageUrl = updatedFrontfacingUrl

          await existingProfile.save()

          await USER_MODEL.setSubStatus(user, true)
          return res.status(200).json(existingProfile)
        }

        return res.status(400).json({
          status: 'failed',
          message: 'Account already has a trip-com profile',
          profile: existingProfile
        })
      }

      // Create new profile if no existing document
      const siteProfileData = await PROFILE_MODEL.create({
        reviewSiteSlug: 'trip-com',
        originalUrl: updatedFrontfacingUrl,
        url: tripCrawlerUrl,
        userId: user.userId,
        metadata: metadata,
        propertyReviewCount: reviewCount,
        propertyExternalId: hotelId,
        propertyType: prop_type,
        reviewPageUrl: tripCrawlerUrl,
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
function extractStringFromHTML ($, regex) {
  const htmlString = $.html()
  const match = htmlString.match(regex)
  return match ? match[1] : null
}
function genbaseTripUrl (url) {
  if (url.startsWith('https://www.trip.com/hotels/detail/?hotelId=')) {
    return url
  }
  const match = url.match(/hotel-detail-(\d+)/)
  if (match) {
    return `https://www.trip.com/hotels/detail/?hotelId=${match[1]}`
  }
  return null
}
