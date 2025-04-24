import { saveObjectToS3 } from '../blobStorage/aws/s3BucketUtility.js'
import { handleAzureBlobAndPipeline } from '../blobStorage/azure/pipelines/azureOchestrator.js'

import { logger } from '../loggers/logger.js'
import { REVIEW } from '../models/documentModel.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { USER_MODEL } from '../models/user.js'
import { fetchOpentableReviews } from '../spiders/opentableSpider.js'
import {
  extractISODate,
  formatReviewBodyString,
  generateMessage
} from '../utilities/utilities.js'

export async function generateOpentableReviews (req, res) {
  try {
    logger('Starting opentable review extraction...', 'info')
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
        message: 'Process failed in <generateOpentableReviews>'
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
      reviewSiteSlug: 'opentable-com'
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
      propertyReviewCount
    } = userProfile

    if (depth === 'full') {
      depth = propertyReviewCount || Infinity
    }

    logger('Fetching trip reviews', 'info')
    const reviewData = await fetchOpentableReviews(
      depth,
      propertyExternalId,
      userProfile
    )

    if (!reviewData.length) {
      logger('Review list is empty', 'warn')
      return res.status(404).json({
        state: 'nothing found',
        isCompleted: false,
        reviewSiteName: reviewSiteSlug,
        reviewDocumentCount: null,
        accountName: property_name,
        profile_id: profile_id,
        endpoint: originalUrl,
        siteId: internalId,
        reviewPage: baseUrl,
        message: []
      })
    }

    for (const review of reviewData) {
      try {
        if (!review) continue

        const auth_name = await extractAuthName(review)

        const existingReview = await REVIEW.findOne({
          authorExternalId: review.reviewId,
          author: auth_name
        })

        if (!existingReview) {
          const reviewRating = review.rating?.overall
          const checkin_date = extractISODate(review?.dinedDateTime)
          const create_date = extractISODate(review?.submittedDateTime)
          const formattedReviewBody = formatReviewBodyString(
            null,
            null,
            review?.text
          )
          const property_response = {
            body: review?.publicRestaurantReply?.message || null,
            responseDate: extractISODate(
              review?.publicRestaurantReply?.responseDateTimeUtc
            )
          }

          const miscellaneous = {
            location: review.user?.metro?.displayName,
            initials: review?.user?.initials,
            isVip: review.user?.isVip
          }

          const subratingsList = extractSubratingsIntoList(review?.rating)

          const reviewTitle = review?.rating?.noise
          const propertyUrl = originalUrl || baseUrl

          const savedReview = await REVIEW.create({
            author: auth_name,
            userId: userId,
            uuid: profile_id,
            siteId: internalId,
            authorReviewCount: review.user?.numOfApprovedReviews,
            authorExternalId: review.reviewId,
            authorProfileUrl: originalUrl,
            externallId: propertyExternalId,
            reviewSiteSlug: reviewSiteSlug,
            reviewBody: formattedReviewBody,
            title: reviewTitle,
            subratings: subratingsList,
            propertyProfileUrl: propertyUrl,
            originalEndpoint: originalUrl,
            reviewDate: create_date,
            stayDate: checkin_date,
            urlAgent: baseUrl,
            propertyName: property_name,
            propertyResponse: property_response.body ? property_response : null,
            miscellaneous: miscellaneous,
            rating: reviewRating
          })

          savedReviews.push(savedReview)
        }
      } catch (error) {
        logger(
          `Error processing review ID ${
            review?.reviewId || 'unknown'
          }: ${error}`,
          'warn'
        )
        continue
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
    //****** Save buckets *** */
    saveObjectToS3(savedReviews)
    handleAzureBlobAndPipeline(savedReviews, [
      'opentable-com',
      profile_id,
      propertyExternalId
    ])
    //******* Save buckets ********* */
  } catch (error) {
    logger(`Error generating trip reviews: ${error}`, 'warn')
  }
}
function extractAuthName (review) {
  try {
    if (!review) return null
    return review.user?.nickname || 'Anonymous'
  } catch (e) {
    logger(`from <extractAuthName>: ${e.message}`)
  }
}
function extractSubratingsIntoList (ratingObj) {
  return Object.entries(ratingObj)
    .filter(
      ([key, value]) =>
        key !== 'value' && key !== 'overall' && typeof value === 'number'
    )
    .map(([key, value]) => ({ key, value }))
}
