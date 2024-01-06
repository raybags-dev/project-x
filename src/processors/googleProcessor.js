import axios from 'axios'
import { ObjectId } from 'mongodb'
import { USER_MODEL } from '../models/user.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { REVIEW } from '../models/documentModel.js'
import { HEADERS } from '../_data_/headers/headers.js'
import { parseReviewHtml } from '../configurations/google.js'

export async function generateGoogleReviews (req, res) {
  try {
    const { email, isAdmin, userId } = await req.locals.user
    const isSubscribed = await USER_MODEL.getSubscriptionStatus(userId)

    if (!isSubscribed)
      return res
        .status(403)
        .json({ status: 'failed', message: 'trial period expired' })

    if (!isAdmin) {
      return res.status(401).json({
        error: 'Something went wrong',
        message: 'Reviews could not be generated from generateGoogleReviews'
      })
    }

    const user = await USER_MODEL.findOne({ email })

    if (!user) {
      return res.status(404).json('User not found!')
    }

    const userProfile = await PROFILE_MODEL.findOne({ userId: user.userId })

    if (!userProfile || !userProfile.url) {
      return res.status(400).json({
        status: 'failed',
        message: 'URL is required to complete this task'
      })
    }

    const {
      url: baseUrl,
      computedUrl,
      name: property_name,
      internalId
    } = userProfile
    const headers = HEADERS.googleHtmlHeaders
    let nextPageToken = null
    let savedReviews = []
    let previousPageToken = null

    const depth = req.query.depth
    const runType = await PROFILE_MODEL.nextRunType(req, res)

    const totalPagesToFetch = depth
      ? parseInt(depth) || 5
      : runType === 'INITIAL' || depth === 'full'
      ? Infinity
      : Infinity

    for (let currentPage = 0; currentPage < totalPagesToFetch; currentPage++) {
      const urlWithPageToken =
        currentPage === 0 ? baseUrl : `${baseUrl}${nextPageToken}`

      try {
        console.log(`Fetching page ${currentPage + 1}: ${urlWithPageToken}`)

        let response = await axios.get(urlWithPageToken, { headers })
        let { data } = response

        let nextPageTokenMatch = data.match(/data-next-page-token="([^"]+)"/)
        nextPageToken = nextPageTokenMatch ? nextPageTokenMatch[1] : null

        const reviewsData = await parseReviewHtml(
          data,
          baseUrl,
          req,
          computedUrl
        )

        for (const review of reviewsData) {
          const existingReview = await REVIEW.findOne({
            authorExternalId: review.authorExternalId,
            author: review.author
          })

          if (!existingReview) {
            const savedReview = await REVIEW.create({
              author: review.author,
              userId: review.userId,
              siteId: internalId,
              reviewPageId: previousPageToken,
              authorExternalId: review.authorExternalId,
              authorProfileUrl: review.authorProfileUrl,
              authorReviewCount: review.authorReviewCount,
              reviewSiteSlug: review.reviewSiteSlug,
              reviewBody: review.reviewBody,
              propertyProfileUrl: computedUrl || review.propertyProfileUrl,
              reviewDate: review.reviewDate,
              urlAgent: urlWithPageToken || review.urlAgent,
              propertyName: property_name || review.propertyName,
              propertyResponse: {
                body: review.propertyResponse.body,
                responseDate: review.propertyResponse.responseDate
              },
              rating: review.rating,
              tripType: review.tripType,
              subratings: review.subratings
            })
            savedReviews.push(savedReview)
          }
        }

        console.log(`Review objects processed: ${savedReviews.length}`)
        if (reviewsData.length === 0) {
          console.log('No more reviews on the current page.')
          break
        }

        // Update previousPageToken for the next iteration
        previousPageToken = nextPageToken
      } catch (error) {
        console.error('Error fetching reviews:', error.message)
      }
    }

    // Update propertyReviewCount in PROFILE_MODEL
    const totalReviewCount = savedReviews.length
    await PROFILE_MODEL.updateOne(
      { userId: user.userId },
      { $set: { propertyReviewCount: totalReviewCount } }
    )

    if (runType === 'INITIAL') {
      await PROFILE_MODEL.updateOne(
        { userId: user.userId },
        { $set: { nextRunType: 'REGULAR' } }
      )
    }

    if (!savedReviews.length) {
      return res.status(204).end()
    }

    console.log('All pages fetched. Process completed.')
    let ownershipId = userProfile.userId || req.locals.user.userId
    const totalCount = await REVIEW.countDocuments({ userId: ownershipId })

    return res.status(200).json({
      state: 'success',
      reviewSiteName: userProfile.reviewSiteSlug,
      reviewDocumentCount: totalCount,
      accountName: userProfile.name,
      endpoint: userProfile.computedUrl,
      siteId: internalId,
      message: 'Reviews have been collected'
    })
  } catch (error) {
    console.log('Error fetching reviews:', error.message)
    res.status(500).json({ error: 'Server error' })
  }
}
export async function updateGoogleReview (req, res) {
  try {
    const { email, isAdmin, userId } = await req.locals.user
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

    const userProfile = await PROFILE_MODEL.findOne({ userId: user.userId })

    if (!userProfile || !userProfile.url)
      return res.status(400).json({
        status: 'failed',
        message: 'URL is required to complete this task'
      })

    const {
      url: baseUrl,
      computedUrl,
      name: property_name,
      internalId
    } = userProfile

    const headers = HEADERS.googleHtmlHeaders
    let savedReviews = []
    let nextPageToken = null
    let matchingReview = null

    const reviewToDelete = req.body.reviewId
    const authorExternalIdToDelete = req.body.authorExternalId

    const deletedReview = await REVIEW.findOneAndDelete({
      _id: new ObjectId(reviewToDelete)
    })

    if (!deletedReview) {
      return res.status(404).json({
        status: 'failed',
        message: 'Review not found or already deleted'
      })
    }

    try {
      do {
        const urlWithPageToken = nextPageToken
          ? `${baseUrl}${nextPageToken}`
          : baseUrl

        const response = await axios.get(urlWithPageToken, { headers })
        const { data } = response

        const reviewsData = await parseReviewHtml(
          data,
          baseUrl,
          req,
          computedUrl
        )

        for (const review of reviewsData) {
          const existingReview = await REVIEW.findOne({
            authorExternalId: review.authorExternalId
          })

          if (!existingReview) {
            const savedReview = await REVIEW.create({
              author: review.author,
              userId: review.userId,
              siteId: internalId,
              reviewPageId: nextPageToken,
              authorExternalId: review.authorExternalId,
              authorProfileUrl: review.authorProfileUrl,
              reviewSiteSlug: review.reviewSiteSlug,
              reviewBody: review.reviewBody,
              propertyProfileUrl: computedUrl || review.propertyProfileUrl,
              reviewDate: review.reviewDate,
              urlAgent: deletedReview.urlAgent || review.urlAgent,
              propertyName: property_name || review.propertyName,
              propertyResponse: {
                body: review.propertyResponse.body,
                responseDate: review.propertyResponse.responseDate
              },
              rating: review.rating,
              tripType: review.tripType,
              subratings: review.subratings
            })
            savedReviews.push(savedReview)

            if (review.authorExternalId === authorExternalIdToDelete) {
              const targetReview = await REVIEW.findOne({
                authorExternalId: req.body.authorExternalId
              })
              return res.status(200).json({
                state: 'success',
                message: 'Reivew updated successfullly!',
                review: targetReview
              })
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

      const ownershipId = userProfile.userId || req.locals.user.userId
      const totalCount = await REVIEW.countDocuments({ userId: ownershipId })

      function extractNextPageToken (data) {
        const nextPageTokenMatch = data.match(/data-next-page-token="([^"]+)"/)
        return nextPageTokenMatch ? nextPageTokenMatch[1] : null
      }

      return res.status(200).json({
        state: 'success',
        reviewSiteName: userProfile.reviewSiteSlug,
        reviewDocumentCount: totalCount,
        accountName: userProfile.name,
        endpoint: userProfile.computedUrl,
        siteId: internalId,
        message: 'Reviews have been collected',
        matchingReview
      })
    } catch (error) {
      console.error('Error fetching reviews:', error.message)
      return res.status(500).json({ error: 'Server error' })
    }
  } catch (error) {
    console.log('Error fetching reviews:', error.message)
    return res.status(500).json({ error: 'Server error' })
  }
}
