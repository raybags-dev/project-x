import { agodaReviewUpdateHandler } from './updateAgoda.js'
import { googleReviewUpdateHandler } from './updateGoogle.js'

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
