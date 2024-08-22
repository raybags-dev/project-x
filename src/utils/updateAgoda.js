import { ObjectId } from 'mongodb'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { REVIEW } from '../models/documentModel.js'
import { fetchAgodaReviews } from '../configurations/agoda.js'
import { logger } from './logger.js'

export async function agodaReviewUpdateHandler (req, res) {
  try {
    const { email, isAdmin, userId } = req.locals.user
    const { reviewId, authorExternalId, reviewSiteSlug } = req.body

    const userProfile = await PROFILE_MODEL.findOne({ userId, reviewSiteSlug })
    const depth = Infinity

    if (!userProfile) {
      return {
        status: 'failed',
        message: 'Account profile could not be found'
      }
    }

    const reviewToBeDeleted = await REVIEW.findOneAndDelete({
      _id: new ObjectId(reviewId)
    })

    if (!reviewToBeDeleted) {
      logger('Review could not be found or has already been deleted', 'warn')
      return {
        status: 'failed',
        message: 'Review not found or already deleted'
      }
    }

    const {
      url: baseUrl,
      propertyExternalId,
      name: property_name,
      internalId,
      originalUrl,
      _id: profile_id,
      reviewPageUrl
    } = userProfile

    let reviewObject = null

    try {
      const reviewData = await fetchAgodaReviews(
        depth,
        propertyExternalId,
        userProfile
      )

      for (const review of reviewData) {
        const existingReview = await REVIEW.findOne({
          authorExternalId: review.hotelReviewId
        })

        const {
          hotelReviewId,
          rating,
          ratingText,
          responderName,
          responseText,
          reviewComments,
          reviewNegatives,
          reviewPositives,
          reviewTitle,
          checkInDate,
          checkOutDate,
          responseDate,
          reviewDate,
          reviewerInfo: {
            countryName,
            displayMemberName,
            reviewGroupName,
            roomTypeName,
            lengthOfStay,
            reviewerReviewedCount,
            isExpertReviewer
          }
        } = review

        if (!existingReview && review.authorExternalId === authorExternalId) {
          const savedReview = await REVIEW.create({
            author: displayMemberName,
            country: countryName,
            userId: userId,
            uuid: profile_id,
            siteId: internalId,
            authorExternalId: hotelReviewId,
            authorProfileUrl: originalUrl,
            authorReviewCount: reviewerReviewedCount,
            reviewSiteSlug: reviewSiteSlug,
            reviewBody: formatReviewString(
              reviewNegatives,
              reviewPositives,
              reviewComments
            ),
            title: `${ratingText && ratingText + '. '}${reviewTitle}`,
            propertyProfileUrl: originalUrl || baseUrl,
            originalEndpoint: originalUrl,
            reviewDate: formattDate(reviewDate),
            checkInDate: formattDate(checkInDate),
            checkOutDate: formattDate(checkOutDate),
            urlAgent: baseUrl,
            propertyName: property_name,
            propertyResponse: {
              body: responseText,
              responseDate: formattDate(responseDate),
              author: responderName
            },
            miscellaneous: {
              roomTypeName,
              lengthOfStay,
              isExpertReviewer
            },
            rating,
            tripType: reviewGroupName,
            subratings: review.subratings
          })

          reviewObject = savedReview
        }
      }

      if (reviewObject) {
        return reviewObject
      }

      return {
        status: 'failed',
        message: 'Review not found after update'
      }
    } catch (error) {
      logger(`Error: update failed: ${error}`, 'error')
      return {
        status: 'failed',
        message: 'Error updating review'
      }
    }
  } catch (error) {
    logger(`Error updating review: ${error}`, 'error')
    return {
      status: 'failed',
      message: 'Error updating review'
    }
  }
}
