import { logger } from '../loggers/logger.js'
import { REVIEW } from '../models/documentModel.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { USER_MODEL } from '../models/user.js'
import { fetchExpediaReviews } from '../spiders/expediaSpider.js'
import parseLocale from '../utils/localizer.js'
import { generateMessage } from '../utils/utilities.js'

export async function generateExpediaReviews (req, res) {
  try {
    logger('Starting expedia review extraction...', 'info')
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
        message: 'Process failed in <generateExpediaReviews>'
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
      reviewSiteSlug: 'expedia-com'
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

    logger('Fetching Expedia reviews', 'info')
    const reviewData = await fetchExpediaReviews(
      depth,
      propertyExternalId,
      userProfile
    )

    if (!reviewData.length) {
      logger('Review list is empty', 'warn')
      return
    }

    for (const review of reviewData) {
      try {
        if (!review) continue

        const auth_name = await extractAuthName(review)

        const existingReview = await REVIEW.findOne({
          authorExternalId: review.id,
          author: auth_name
        })

        if (!existingReview) {
          const local = review.locale || null
          const rating = to_base_rating(review)
          const local_language = parseLocale(local)?.fullLanguage
          const review_data = formatFromUnix(review)
          const formattedReviewBody = formatReviewString([
            review.text.length && review.text,
            (review?.themes?.length && review.themes[0].label) || null
          ])
          const property_response = {
            body:
              review.managementResponses?.length &&
              review.managementResponses[0]?.response,
            responseDate: extractHotelResponseDate(
              (review?.managementResponses?.length &&
                review.managementResponses[0]?.header?.text) ||
                null
            )
          }

          const miscellaneous = {
            lengthOfStay: extractNumberOfStays(review),
            languageDetails: parseLocale(review?.locale || null)
          }

          const recommend = getRecommends(review)
          const title = review?.title || review?.superlative
          const propertyUrl = originalUrl || baseUrl
          const review_check = review?.brandType

          const savedReview = await REVIEW.create({
            author: auth_name,
            userId: userId,
            brandCheck: review_check,
            recommends: recommend,
            uuid: profile_id,
            siteId: internalId,
            language: local_language,
            authorExternalId: review.id,
            authorProfileUrl: originalUrl,
            externallId: propertyExternalId,
            reviewSiteSlug: reviewSiteSlug,
            reviewBody: formattedReviewBody || null,
            title: title,
            propertyProfileUrl: propertyUrl,
            originalEndpoint: originalUrl,
            reviewDate: review_data,
            stayDate: review_data,
            urlAgent: baseUrl,
            propertyName: property_name,
            propertyResponse: property_response.body ? property_response : null,
            miscellaneous: miscellaneous,
            rating: rating
          })

          savedReviews.push(savedReview)
        }
      } catch (error) {
        logger(
          `Error processing review ID ${review?.id || 'unknown'}: ${error}`,
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
  } catch (error) {
    logger(`Error generating Expedia reviews: ${error}`, 'warn')
  }
}

function formatReviewString (test_body_list) {
  try {
    if (!Array.isArray(test_body_list) || test_body_list.length === 0) return ''

    let formattedString = ''
    for (const body of test_body_list) {
      if (body && typeof body === 'string') {
        formattedString += `${body}<br><br>`
      }
    }

    return formattedString.trim() || ''
  } catch (e) {
    logger(`from <formatReviewString>: ${e.message}`)
  }
}
function formatFromUnix (review) {
  try {
    if (!review) return
    const time_string = review?.submissionTime?.longDateFormat
    if (!time_string) {
      console.error('Invalid date format')
      return 'Invalid Date'
    }
    const date = new Date(time_string)

    if (isNaN(date.getTime())) {
      console.error(`Invalid date: ${time_string}`)
      return 'Invalid Date'
    }

    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  } catch (e) {
    logger(`from <formatFromUnix>: ${e.message}`)
  }
}
function to_base_rating (review) {
  try {
    const review1 = review.reviewScoreWithDescription?.value
    const review2 = review.reviewScoreWithDescription?.label
    const review_string = review1 || review2 || null

    if (!review_string) return null

    const match =
      review_string.match(/^(\d+)\//) || review_string.match(/^(\d+)\s*out/)
    if (!match || !match[1]) return null

    const numericRating = parseFloat(match[1])
    if (isNaN(numericRating)) return null

    return (numericRating / 2).toFixed(1)
  } catch (e) {
    logger(`from <to_base_rating>: ${e.message}`)
  }
}
function extractNumberOfStays (review) {
  try {
    const stays_string = review.reviewFooter?.messages[0]?.text?.text
    const match = stays_string?.match(/Stayed (\d+) nights/)
    return match ? parseInt(match[1], 10) : null
  } catch (e) {
    logger(`from <extractNumberOfStays>: ${e.message}`)
  }
}
function extractHotelResponseDate (str) {
  try {
    const match = str?.match(/on (\w{3} \d{1,2}, \d{4})/)
    if (match) {
      const dateStr = match[1]
      const parsedDate = new Date(dateStr)
      if (!isNaN(parsedDate)) {
        return parsedDate.toLocaleDateString('en-GB')
      }
    }
    return null
  } catch (e) {
    logger(`from <extractHotelResponseDate>: ${e.message}`)
  }
}
function extractAuthName (review) {
  try {
    if (!review) return null
    return (
      review.reviewFooter?.messages[0]?.seoStructuredData?.content ||
      review.reviewAuthorAttribution?.text ||
      'Anonymous'
    )
  } catch (e) {
    logger(`from <extractAuthName>: ${e.message}`)
  }
}
function getRecommends (review) {
  try {
    const recommendsValue =
      review?.reviewInteractionSections[0]?.primaryDisplayString
    if (recommendsValue == null) return 'No'
    return String(recommendsValue) === '1' ? 'Yes' : 'No'
  } catch (e) {
    logger(`from <getRecommends>: ${e.message}`)
  }
}
