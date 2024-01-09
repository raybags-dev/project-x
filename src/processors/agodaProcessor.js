import axios from 'axios'
import { ObjectId } from 'mongodb'
import { USER_MODEL } from '../models/user.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { REVIEW } from '../models/documentModel.js'
import { fetchAgodaReviews } from '../configurations/agoda.js'

export async function generateAgodaReviews (req, res) {
  try {
    const { email, isAdmin, userId } = await req.locals.user
    const isSubscribed = await USER_MODEL.getSubscriptionStatus(userId)
    let depth = req.query.depth

    if (depth === 'full') {
      depth = Infinity
    }

    if (!isSubscribed)
      return res.status(403).json({
        status: 'failed',
        message: 'trial period expired'
      })

    if (!isAdmin) {
      return res.status(401).json({
        error: 'Something went wrong',
        message: 'Reviews could not be generated from generateAgodaReviews'
      })
    }
    const savedReviews = []
    const user = await USER_MODEL.findOne({ email })

    if (!user) {
      return res.status(404).json('User not found!')
    }

    const userProfile = await PROFILE_MODEL.findOne({
      userId: user.userId,
      reviewSiteSlug: 'agoda-com'
    })

    if (!userProfile || !userProfile.url) {
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
      reviewSiteSlug,
      reviewPageUrl
    } = userProfile

    const reviewData = await fetchAgodaReviews(
      depth,
      propertyExternalId,
      userProfile
    )

    for (const review of reviewData) {
      const existingReview = await REVIEW.findOne({
        authorExternalId: review.hotelReviewId,
        author: review.reviewerInfo.displayMemberName
      })

      const {
        hotelReviewId,
        rating,
        ratingText,
        responderName,
        responseDateText,
        responseText,
        responseTranslateSource,
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

      if (!existingReview) {
        const savedReview = await REVIEW.create({
          author: displayMemberName,
          country: countryName,
          userId: userId,
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
        savedReviews.push(savedReview)
      }
    }

    console.log('All pages fetched. Process completed.')
    let ownershipId = userId || req.locals.user.userId
    const totalCount = await REVIEW.countDocuments({ userId: ownershipId })

    res.status(200).json({
      state: 'success',
      reviewSiteName: reviewSiteSlug,
      reviewDocumentCount: totalCount,
      accountName: property_name,
      endpoint: originalUrl,
      siteId: internalId,
      reviewPage: `${
        (reviewPageUrl && 'https://www.agoda.com/en-gb' + reviewPageUrl) ||
        originalUrl
      }`,
      message: 'Agoda reviews have been collected!'
    })
  } catch (error) {
    console.error('Error generating Agoda reviews:', error.message)
    res.status(500).json({ error: 'Server error' })
  }
}
function formatReviewString (reviewNegatives, reviewPositives, reviewComments) {
  let formattedString = reviewComments || ''
  if (reviewNegatives) {
    formattedString += `\n\nBad: ${reviewNegatives}`
  }
  if (reviewPositives) {
    formattedString += `\n\nGood: ${reviewPositives}`
  }
  return formattedString.trim()
}
function formattDate (originalDate) {
  if (originalDate) {
    const match = originalDate.match(/^(\d{4}-\d{2}-\d{2})T/)
    if (match && match[1]) {
      return match[1]
    }
  }
  return originalDate
}
