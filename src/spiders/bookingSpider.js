import { HEADERS } from '../data/headers/headers.js'
import axiosInstance from '../downloader/HTTPEngine.js'
import { logger } from '../loggers/logger.js'
import { validateResponse } from '../utilities/generalUtilities.js'

export async function fetchBookingReviews (
  depth = 1,
  propertyExternalId,
  userProfile
) {
  const pageSize = 10
  try {
    const { url, reviewPageUrl, metadata } = await userProfile
    const endpointUrl = reviewPageUrl || url
    const headers = { ...HEADERS.bookingHeadersGenReviews, method: 'POST' }

    logger(`Fetching reviews with a depth of ${depth}...`, 'info')

    const allReviews = await fetchPerPage(
      propertyExternalId,
      endpointUrl,
      headers,
      depth,
      pageSize,
      metadata
    )
    logger(`Fetched ${allReviews.length} reviews successfully.`, 'info')
    return allReviews
  } catch (error) {
    logger(`Error fetching reviews: ${error.message}`, 'error')
    return []
  }
}
async function fetchPerPage (
  propertyExternalId,
  endpointUrl,
  headers,
  depth,
  pageSize,
  metadata
) {
  const allReviews = []
  const maxConcurrency = 40 // Increased concurrency to 40

  // Process pages in batches
  for (let batchIndex = 0; batchIndex < depth; batchIndex += maxConcurrency) {
    // Calculate how many pages to process in this batch (not exceeding depth)
    logger(`fetching: ${endpointUrl}`, 'info')
    const pagesInBatch = Math.min(maxConcurrency, depth - batchIndex)
    logger(
      `Processing batch of ${pagesInBatch} pages (${batchIndex + 1}-${
        batchIndex + pagesInBatch
      })`,
      'info'
    )

    // Create batch promises
    const batchPromises = Array.from({ length: pagesInBatch }, (_, i) => {
      const pageIndex = batchIndex + i
      const currentSkip = pageIndex * pageSize

      return fetchPage(
        propertyExternalId,
        endpointUrl,
        headers,
        currentSkip,
        pageSize,
        metadata,
        allReviews
      ).catch(error => {
        logger(
          `Error fetching page at skip=${currentSkip}: ${error.message}`,
          'error'
        )
        return { error: true } // Return object to identify errors
      })
    })

    // Wait for the current batch to complete
    const results = await Promise.allSettled(batchPromises)

    // Check if any critical errors occurred that should stop processing
    if (
      results.every(
        result =>
          result.status === 'fulfilled' &&
          result.value &&
          result.value.error === true
      )
    ) {
      logger('All requests in batch failed, stopping pagination', 'error')
      break
    }

    // Process successful results
    results.forEach((result, index) => {
      const pageNumber = batchIndex + index + 1
      if (
        result.status === 'fulfilled' &&
        result.value &&
        !result.value.error
      ) {
        logger(`Successfully processed page ${pageNumber}`, 'info')
      }
    })
  }

  logger(`Total reviews collected: ${allReviews.length}`, 'info')
  return allReviews
}
async function fetchPage (
  propertyExternalId,
  endpointUrl,
  headers,
  skip,
  pageSize,
  metadata,
  allReviews
) {
  logger(`Fetching reviews from skip=${skip}...`, 'info')

  const requestBody = createRequestBody(
    propertyExternalId,
    skip,
    metadata.rating,
    metadata.dest_ufi,
    metadata.countryCode,
    metadata.dest_type
  )
  const responseData = await fetchPageData(endpointUrl, requestBody, headers)

  if (!responseData) return

  allReviews.push(...responseData?.reviewCard)
  logger(`Collected ${allReviews.length} reviews`, 'info')
}
async function fetchPageData (endpointUrl, requestBody, headers) {
  try {
    const response = await axiosInstance.post(endpointUrl, requestBody, {
      headers
    })

    if (!validateResponse(response)) return

    const isResponseSuccess =
      response.status == 200 && response.statusText == 'OK'

    if (isResponseSuccess) {
      const reviewsObj = await response.data.data?.reviewListFrontend
      return reviewsObj
    }
    return null
  } catch (error) {
    logger(`Error fetching page: ${error.message}`, 'error')
    return null
  }
}
function createRequestBody (
  hotelId,
  skip,
  rating,
  destId,
  country_code = 'au',
  dest_type
) {
  return {
    operationName: 'ReviewList',
    variables: {
      shouldShowReviewListPhotoAltText: true,
      input: {
        hotelId: parseInt(hotelId),
        ufi: parseInt(`-${destId}`),
        hotelCountryCode: country_code,
        sorter: 'NEWEST_FIRST',
        filters: { text: '' },
        skip,
        limit: 10,
        hotelScore: parseInt(rating),
        upsortReviewUrl: '',
        searchFeatures: {
          destId: parseInt(`-${destId}`),
          destType: `${dest_type || 'CITY'}`
        }
      }
    },
    extensions: {},
    query: `query ReviewList($input: ReviewListFrontendInput!, $shouldShowReviewListPhotoAltText: Boolean = false) {
      reviewListFrontend(input: $input) {
        ... on ReviewListFrontendResult {
          ratingScores {
            name translation value
            ufiScoresAverage { ufiScoreLowerBound ufiScoreHigherBound __typename }
            __typename
          }
          topicFilters { id name isSelected translation { id name __typename } __typename }
          reviewScoreFilter { name value count __typename }
          languageFilter { name value count countryFlag __typename }
          timeOfYearFilter { name value count __typename }
          customerTypeFilter { count name value __typename }
          reviewCard {
            reviewUrl guestDetails { username avatarUrl countryCode countryName avatarColor showCountryFlag anonymous guestTypeTranslation __typename }
            bookingDetails { customerType roomId roomType { id name __typename } checkoutDate checkinDate numNights stayStatus __typename }
            reviewedDate isTranslatable helpfulVotesCount reviewScore
            textDetails { title positiveText negativeText textTrivialFlag lang __typename }
            isApproved partnerReply { reply __typename }
            positiveHighlights { start end __typename }
            negativeHighlights { start end __typename }
            editUrl photos { id urls { size url __typename } kind mlTagHighestProbability @include(if: $shouldShowReviewListPhotoAltText) __typename }
            __typename
          }
          reviewsCount sorters { name value __typename } __typename
        }
        ... on ReviewsFrontendError { statusCode message __typename } __typename
      }
    }`
  }
}
