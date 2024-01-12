import axios from 'axios'
import { ObjectId } from 'mongodb'

import { HEADERS } from '../_data_/headers/headers.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { REVIEW } from '../models/documentModel.js'
import { parseReviewHtml } from '../configurations/google.js'

export async function googleReviewUpdateHandler (req, res) {
  try {
    const { reviewId, authorExternalId } = await req.body
    const user = req.locals.user

    const headers = HEADERS.googleHtmlHeaders
    let savedReviews = []
    let nextPageToken = null
    let reviewObject = null

    const reviewToDelete = reviewId
    const targetAuthorExternalId = authorExternalId

    const userProfile = await PROFILE_MODEL.findOne({ userId: user.userId })

    const {
      url: baseUrl,
      computedUrl,
      name: property_name,
      internalId
    } = userProfile

    if (!userProfile)
      return {
        status: 'failed',
        message: 'Account profile could not be found'
      }

    const reviewToBeDeleted = await REVIEW.findOneAndDelete({
      _id: new ObjectId(reviewToDelete)
    })

    if (!reviewToBeDeleted) {
      console.log('Review could not be found or has already been deleted')
      return {
        status: 'failed',
        message: 'Review not found or already deleted'
      }
    }

    try {
      let pageCount = 0
      do {
        const urlWithPageToken = nextPageToken
          ? `${baseUrl}${nextPageToken}`
          : baseUrl

        const response = await axios.get(urlWithPageToken, { headers })
        const { data } = response

        const reviewsData = await parseReviewHtml(data, baseUrl, req)

        for (const review of reviewsData) {
          const existingReview = await REVIEW.findOne({
            authorExternalId: review.authorExternalId
          })

          if (!existingReview) {
            const savedReview = await REVIEW.create({
              reviewSiteSlug: review.reviewSiteSlug,
              siteId: internalId,
              reviewPageId: nextPageToken,
              urlAgent: reviewToBeDeleted.urlAgent || review.urlAgent,
              propertyProfileUrl:
                computedUrl ||
                review.propertyProfileUrl ||
                review.originalEndpoint,
              author: review.author,
              country: review.country,
              authorExternalId: review.authorExternalId,
              authorLocation: review.authorLocation,
              authorReviewCount: review.authorReviewCount,
              authorProfileUrl: review.authorProfileUrl,
              reviewBody: review.reviewBody,
              propertyResponse: {
                body: review.propertyResponse.body,
                responseDate: review.propertyResponse.responseDate,
                author: review.propertyResponse.author
              },
              hasPropertyResponse:
                (review.propertyResponse.body &&
                  review.hasPropertyResponse === true) ||
                review.hasPropertyResponse === false,
              propertyName: property_name || review.propertyName,
              userId: review.userId,
              title: review.title,
              reviewDate: review.reviewDate,
              tripType: review.tripType,
              rating: review.rating,
              subratings: review.subratings
            })
            savedReviews.push(savedReview)

            if (
              review.authorExternalId.trim() === targetAuthorExternalId.trim()
            ) {
              const targetReview = await REVIEW.findOne({
                authorExternalId: targetAuthorExternalId
              })

              return (reviewObject = targetReview)
            }
          }
        }
        nextPageToken = extractNextPageToken(data)
      } while (nextPageToken)

      const totalReviewCount = savedReviews.length
      await PROFILE_MODEL.updateOne(
        { userId: user.userId },
        { $set: { propertyReviewCount: totalReviewCount } }
      )

      function extractNextPageToken (data) {
        const nextPageTokenMatch = data.match(/data-next-page-token="([^"]+)"/)
        console.log(`Processesing reviews on page: ${++pageCount}`)
        return nextPageTokenMatch ? nextPageTokenMatch[1] : null
      }

      return reviewObject
    } catch (error) {
      return console.error('Error:  update failed:', error)
    }
  } catch (error) {
    return console.error('Error updating review:', error)
  }
}
