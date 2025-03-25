import { HEADERS } from '../_data_/headers/headers.js'
import { logger } from '../loggers/logger.js'
import { REVIEW } from '../models/documentModel.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { USER_MODEL } from '../models/user.js'
import { parseReviewHtml } from '../ochestrators/googleOche.js'
import axiosInstance from '../utils/proxy.js'

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

    const userProfile = await PROFILE_MODEL.findOne({
      userId: user.userId,
      reviewSiteSlug: 'google-com'
    })

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
      internalId,
      _id: profile_id,
      originalUrl
    } = userProfile

    const headers = HEADERS.googleHtmlHeaders
    let nextPageToken = null
    let savedReviews = []
    let previousPageToken = null

    const depth = req.query.depth
    const runType = await PROFILE_MODEL.nextRunType(req, res)

    const totalPagesToFetch = depth
      ? parseInt(depth) || 10
      : runType === 'INITIAL' || depth === 'full'
      ? Infinity
      : Infinity

    for (let currentPage = 0; currentPage < totalPagesToFetch; currentPage++) {
      const urlWithPageToken =
        currentPage === 0 ? baseUrl : `${baseUrl}${nextPageToken}`

      try {
        logger(`Fetching page ${currentPage + 1}: ${urlWithPageToken}`, 'info')

        let response = await axiosInstance.get(urlWithPageToken, { headers })
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
              uuid: profile_id,
              reviewPageId: previousPageToken,
              authorExternalId: review.authorExternalId,
              authorProfileUrl: review.authorProfileUrl,
              authorReviewCount: review.authorReviewCount,
              reviewSiteSlug: review.reviewSiteSlug,
              reviewBody: review.reviewBody,
              propertyProfileUrl: computedUrl || review.propertyProfileUrl,
              originalEndpoint: originalUrl,
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

        logger(`Review objects processed: ${savedReviews.length}`, 'info')
        if (reviewsData.length === 0) {
          logger('No more reviews on the current page.', 'error')
          break
        }
        // Update previousPageToken for the next iteration
        previousPageToken = nextPageToken
      } catch (error) {
        logger(`Error fetching reviews: ${error}`, 'info')
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

    logger('All pages fetched. Process completed.', 'info')
    let ownershipId = userProfile.userId || req.locals.user.userId
    const totalCount = await REVIEW.countDocuments({ userId: ownershipId })

    return res.status(200).json({
      state: 'success',
      isCompleted: res.statusCode >= 200 && res.statusCode < 300,
      reviewSiteName: userProfile.reviewSiteSlug,
      reviewDocumentCount: totalCount,
      accountName: userProfile.name,
      profile_id: profile_id,
      endpoint: userProfile.computedUrl,
      siteId: internalId,
      message: 'completed!'
    })
  } catch (error) {
    logger(`Error fetching reviews: ${error}`, 'error')
    res.status(500).json({ error: 'Server error' })
  }
}
