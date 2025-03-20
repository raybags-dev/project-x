import { HEADERS } from '../_data_/headers/headers.js'
import { USER_MODEL } from '../models/user.js'
import axiosInstance from './proxy.js'
import { agodaReviewUpdateHandler } from './updateAgoda.js'
import { googleReviewUpdateHandler } from './updateGoogle.js'
import { validateEndpointDomain } from './validateBaseUrl.js'

export function generateMessage (savedReviews, reviewsData) {
  if (!savedReviews || !reviewsData) return
  return savedReviews.length && reviewsData.length
    ? `${savedReviews.length} new objects were saved, out of ${reviewsData.length} total collected.`
    : savedReviews.length
    ? `${savedReviews.length} new objects were saved.`
    : reviewsData.length
    ? `${reviewsData.length} objects were collected - nothing new saved.`
    : `No objects were collected.`
}
export async function updateReview (req, res) {
  try {
    const { email, isAdmin, userId } = await req.locals.user
    const { reviewSiteSlug } = req.body
    const isSubscribed = await USER_MODEL.getSubscriptionStatus(userId)

    if (!isSubscribed)
      return res
        .status(403)
        .json({ status: 'failed', message: 'trial period expired' })

    if (!isAdmin)
      return res.status(401).json({
        error: 'Something went wrong',
        message: 'Reviews could not be generated from generateGoogleReviews'
      })

    const user = await USER_MODEL.findOne({ email })
    if (!user) return res.status(404).json('User not found!')

    const profile = await PROFILE_MODEL.findOne({ userId })

    if (!profile)
      return res.status(404).json('Profile not found or has been deleted!')

    const { computedUrl, name, originalUrl } = profile

    try {
      // ********* GOOGLE UPDATE REVIEWS LOGIC ***********

      if (reviewSiteSlug === 'google-com') {
        const reviewObject = await googleReviewUpdateHandler(req, res)
        if (reviewObject?.status === 'failed')
          return res.status(500).json({
            message:
              reviewObject.message || 'Something went wrong, update failed.'
          })
        return res.status(200).json({
          message: 'Review updated success',
          uuid: reviewObject.uuid,
          reviewSiteSlug,
          url: computedUrl || originalUrl,
          data: [reviewObject],
          propertyName: name,
          requestTimestamp: new Date()
        })
      }
      // ********* AGODA UPDATE REVIEWS LOGIC ***********
      if (reviewSiteSlug === 'agoda-com') {
        logger('review update for this site not yet implimented', 'warn')
        return res.status(501).json({
          error: 'Not completed',
          message: 'Endpoint not yet implimented!'
        })
        const reviewObject = await agodaReviewUpdateHandler(req, res)
        if (reviewObject?.status === 'failed')
          return res.status(500).json({
            message:
              reviewObject.message || 'Something went wrong, update failed.'
          })
        return res.status(200).json({
          message: 'Review updated success',
          uuid: reviewObject.uuid,
          reviewSiteSlug,
          url: computedUrl || originalUrl,
          data: [reviewObject],
          propertyName: name,
          requestTimestamp: new Date()
        })
      }
      return res.status(404).json({
        message: 'Process failed, No updates occured!'
      })
    } catch (error) {
      logger(`Error fetching reviews: ${error}`, 'error')
      return res.status(500).json({ error: 'Server error', message: error })
    }
  } catch (error) {
    logger(`Error fetching reviews: ${error}`, 'error')
    return res.status(500).json({ error: 'Server error' })
  }
}
export async function isUserSubscribed (user) {
  try {
    return !!user?.isSubscribed
  } catch (error) {
    console.error('Error checking subscription:', error)
    return false
  }
}
export function extractISODate (originalDate) {
  if (originalDate) {
    const match = originalDate.match(/^(\d{4}-\d{2}-\d{2})T/)
    if (match && match[1]) {
      return match[1]
    }
  }
  return originalDate
}
export function convertUnixToDate (timestamp) {
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
export function formatReviewBodyString (
  reviewNegatives,
  reviewPositives,
  reviewComments
) {
  let formattedString = reviewComments || ''
  if (reviewNegatives) {
    formattedString += `\n\nBad: ${reviewNegatives}`
  }
  if (reviewPositives) {
    formattedString += `\n\nGood: ${reviewPositives}`
  }
  return formattedString.trim()
}
export function cleanUpBaseUrl (url) {
  if (!url) return ''
  let baseUrl = url?.split('?')[0]
  const match = baseUrl?.match(/^(https?:\/\/[^?#]+\.html)/)
  return match ? match[1] : baseUrl
}
export async function validateAndAuthorizeUser (
  req,
  res,
  shouldCleanUrl = true
) {
  const frontFacingUrl = shouldCleanUrl
    ? cleanUpBaseUrl(req.body.frontFacingUrl)
    : req.body.frontFacingUrl

  const isValid = validateEndpointDomain(frontFacingUrl, req)
  if (!isValid) {
    return {
      error: res.status(400).json('Error: Bad request - Invalid baseUrl!')
    }
  }

  const { email, isAdmin, userId } = await req.locals.user
  if (!isAdmin) {
    return {
      error: res
        .status(400)
        .json({ status: 'failed', message: 'Unauthorized request' })
    }
  }

  const user = await USER_MODEL.findOne({ email })
  if (!user) {
    return { error: res.status(404).json('User not found!') }
  }

  const isSubscribed = await USER_MODEL.getSubscriptionStatus(userId)
  if (!isSubscribed) {
    return {
      error: res.status(400).json({
        status: 'failed',
        message:
          'User is unsubscribed - review profile creation requires an active subscription'
      })
    }
  }

  return { frontFacingUrl, user }
}
export async function getAgodaCreds (req, res) {
  try {
    const frontFacingUrl = req.body.frontFacingUrl
    const { agodaHeadersGenProfile } = HEADERS

    const response = await axiosInstance.get(frontFacingUrl, {
      headers: agodaHeadersGenProfile
    })
    if (response.status === 200) {
      const body = response.data

      const hotelId1Regex = /hotelId:(\d+)/
      const matchHotelId1 = body.match(hotelId1Regex)
      const hotelId1 = matchHotelId1 ? matchHotelId1[1] : null

      const hotelId2Regex = /propertyId:(\d+)/
      const matchHotelId2 = body.match(hotelId2Regex)
      const hotelId2 = matchHotelId2 ? matchHotelId2[1] : null

      const hotelId3Regex = /hotel_id=(\d+)/
      const matchHotelId3 = body.match(hotelId3Regex)
      const hotelId3 = matchHotelId3 ? matchHotelId3[1] : null

      return hotelId1 || hotelId2 || hotelId3
    }
  } catch (error) {
    logger(`Error, 'hotelId could not be fetched: ${error.message}`, 'error')
  }
}
