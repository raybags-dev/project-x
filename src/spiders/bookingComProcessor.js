import { USER_MODEL } from '../models/user.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { REVIEW } from '../models/documentModel.js'
import { fetchBookingReviews } from '../configurations/bookingCom.js'
import { generateMessage } from '../utils/utilities.js'
import { logger } from '../loggers/logger.js'

export async function generateBookingComReviews (req, res) {
  try {
    logger('Starting generateBookingComReviews function', 'info')
    const { email, isAdmin, userId } = await req.locals.user
    const isSubscribed = await USER_MODEL.getSubscriptionStatus(userId)
    let depth = req.query.depth

    if (!isSubscribed) {
      logger('User subscription expired', 'info')
      return res.status(403).json({
        status: 'failed',
        message: 'trial period expired'
      })
    }

    if (!isAdmin) {
      logger('User is not an admin', 'info')
      return res.status(401).json({
        error: 'Something went wrong',
        message: 'Process failed in  <generateBookingComReviews>'
      })
    }
    const savedReviews = []
    const user = await USER_MODEL.findOne({ email })

    if (!user) {
      logger('User not found', 'info')
      return res.status(404).json('User not found!')
    }

    const userProfile = await PROFILE_MODEL.findOne({
      userId: user.userId,
      reviewSiteSlug: 'booking-com'
    })

    if (!userProfile || !userProfile.url) {
      logger('User profile or URL not found', 'info')
      return res.status(400).json({
        status: 'failed',
        message: 'URL is required to complete this task'
      })
    }

    const {
      url: baseUrl,
      propertyExternalId,
      name: property_name,
      internalId,
      originalUrl,
      _id: profile_id,
      reviewSiteSlug,
      reviewPageUrl,
      propertyReviewCount
    } = userProfile

    if (depth === 'full') {
      depth = (propertyReviewCount && propertyReviewCount) || Infinity
    }

    logger('Fetching booking reviews', 'info')
    const reviewData = await fetchBookingReviews(
      depth,
      propertyExternalId,
      userProfile
    )

    for (const review of reviewData) {
      const existingReview = await REVIEW.findOne({
        authorExternalId: review.reviewUrl,
        author: review.guestDetails.username
      })

      if (!existingReview) {
        const savedReview = await REVIEW.create({
          author: review.guestDetails?.username,
          country: review.guestDetails?.countryName,
          userId: userId,
          recommends: review.isApproved,
          uuid: profile_id,
          siteId: internalId,
          language: review.textDetails?.lang,
          authorExternalId: review.reviewUrl,
          authorProfileUrl: originalUrl,
          externallId: propertyExternalId,
          reviewSiteSlug: reviewSiteSlug,
          reviewBody: formatReviewString(
            review.textDetails?.negativeText,
            review.textDetails?.positiveText
          ),
          title: review.textDetails.title,
          propertyProfileUrl: originalUrl || baseUrl,
          originalEndpoint: originalUrl,
          reviewDate: formatFromUnix(review.reviewedDate),
          checkInDate: review.bookingDetails.checkinDate,
          checkOutDate: review.bookingDetails.checkoutDate,
          stayDate: review.bookingDetails.checkinDate,
          urlAgent: baseUrl,
          propertyName: property_name,
          propertyResponse: {
            body: review.partnerReply?.reply
          },
          isApproved: review?.isApproved,
          miscellaneous: {
            roomTypeName: review.bookingDetails.roomType?.name,
            roomId: review.bookingDetails.roomType.id,
            lengthOfStay: review.bookingDetails.numNights
          },
          rating: to_base_rating(review.reviewScore),
          tripType: review.bookingDetails.customerType,
          stayStatus: review.bookingDetails.stayStatus
        })
        savedReviews.push(savedReview)
      }
    }

    logger('All pages fetched. Process completed.', 'info')
    let ownershipId = userId || req.locals.user.userId
    const totalCount = await REVIEW.countDocuments({ userId: ownershipId })

    res.status(200).json({
      state: 'success',
      isCompleted: res.statusCode >= 200 && res.statusCode < 300,
      reviewSiteName: reviewSiteSlug,
      reviewDocumentCount: totalCount,
      accountName: property_name,
      profile_id: profile_id,
      endpoint: originalUrl,
      siteId: internalId,
      reviewPage: baseUrl,
      message: generateMessage(savedReviews, reviewData)
    })
  } catch (error) {
    logger(`Error generating Booking reviews: ${error.message}`, 'error')
    res.status(500).json({ error: 'Server error' })
  }
}
function formatReviewString (reviewNegatives = '', reviewPositives = '') {
  let formattedString = ''
  if (reviewNegatives) {
    formattedString += `\n\nBad: ${reviewNegatives}`
  }
  if (reviewPositives) {
    formattedString += `\n\nGood: ${reviewPositives}`
  }
  return formattedString.trim()
}
function formatFromUnix (timestamp) {
  const date = new Date(timestamp * 1000)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
function to_base_rating (rating) {
  const numericRating = typeof rating === 'string' ? parseFloat(rating) : rating
  if (isNaN(numericRating)) return null
  return (numericRating / 2).toFixed(1)
}
