import { HEADERS } from '../_data_/headers/headers.js'
import { logger } from '../loggers/logger.js'
import axiosInstance from '../utils/proxy.js'

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
async function fetchPageData (endpointUrl, requestBody, headers) {
  try {
    const response = await axiosInstance.post(endpointUrl, requestBody, {
      headers
    })
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
async function fetchPerPage (
  propertyExternalId,
  endpointUrl,
  headers,
  depth,
  pageSize,
  metadata
) {
  let skip = 0
  const allReviews = []

  while (skip < depth * pageSize) {
    const requests = Array.from({ length: Math.min(5, depth) }, (_, i) => {
      const currentSkip = skip + i * pageSize
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
      })
    })

    const results = await Promise.allSettled(requests)
    if (results.some(res => res.status === 'rejected')) break

    skip += 5 * pageSize
  }
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
function createRequestBody (
  hotelId,
  skip,
  rating,
  destId,
  country_code = '',
  dest_type
) {
  return {
    operationName: 'ReviewList',
    variables: {
      shouldShowReviewListPhotoAltText: false,
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
