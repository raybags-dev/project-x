import { HEADERS } from '../data/headers/headers.js'
import { logger } from '../loggers/logger.js'
import { findTotalIndexById } from '../profileGeneratorsControllers/agodaProfileGeneratorController.js'
import { validateResponse } from '../utils/generalUtilities.js'
import axiosInstance from '../utils/proxy.js'

export async function fetchAgodaReviews (
  depth = 1,
  propertyExternalId,
  userProfile,
  isUpdating = false
) {
  const pageSize1 = 20
  const pageSize2 = 70

  try {
    const { reviewPageUrl } = await userProfile

    const endpointUrl =
      'https://www.agoda.com/api/cronos/property/review/ReviewComments'
    const headers = { ...HEADERS.agodaApiHeaders, method: 'POST' }

    const parallelCalls = Math.max(2, Math.min(depth, 5))
    logger(`Running with ${parallelCalls} parallel calls...`, 'info')

    const allReviews = await fetchAgodaReviewsPerPage(
      propertyExternalId,
      reviewPageUrl,
      endpointUrl,
      headers,
      parallelCalls,
      depth,
      pageSize1,
      pageSize2,
      []
    )

    logger('All pages fetched.', 'info')
    return allReviews
  } catch (error) {
    logger(`Error calling Agoda API: ${error.message}`, 'error')
    return []
  }
}
async function fetchPageData (endpointUrl, requestBody, headers) {
  try {
    const response = await axiosInstance.post(endpointUrl, requestBody, {
      headers
    })

    if (!validateResponse(response)) return

    if (!response.data?.comments || response.data?.comments?.length === 0) {
      logger('⚠️  No more comments available. Exiting...', 'info')
      return null
    }

    return response.data
  } catch (error) {
    throw error
  }
}
async function fetchPage (
  propertyExternalId,
  reviewPageUrl,
  endpointUrl,
  headers,
  page,
  pageSize,
  isReviewPage,
  allReviews
) {
  logger(`Fetching page: ${page}...`, 'info')

  const requestBody = createRequestBody(
    propertyExternalId,
    page,
    pageSize,
    (isReviewPage = false)
  )

  try {
    const responseData = await fetchPageData(endpointUrl, requestBody, headers)
    const comments = responseData?.comments
    const providerList = responseData?.providerList

    const totalReviewsCount = await findTotalIndexById(providerList, 332)

    allReviews.push(...comments)

    logger(
      `Total reviews collected: ${allReviews.length}/${totalReviewsCount}`,
      'info'
    )

    return allReviews.length >= totalReviewsCount
  } catch (error) {
    if (
      error.response &&
      error.response.status === 429 &&
      error.response.data &&
      error.response.data.errorCode === 'TOO_MANY_REQUEST'
    ) {
      logger('TOO_MANY_REQUEST detected. Try again later.', 'info')
      return true
    }

    if (error.message.includes('length')) {
      logger('No reviews found!', 'info')
      throw new Error('No reviews found!')
    }

    logger(`Error fetching page: ${error}`, 'error')
    throw error
  }
}
async function fetchAgodaReviewsPerPage (
  propertyExternalId,
  reviewPageUrl,
  endpointUrl,
  headers,
  parallelCalls,
  depth,
  pageSize1,
  pageSize2,
  allReviews
) {
  let page = 1

  do {
    let errorEncountered = false

    const pagePromises = []
    for (let i = 0; i < parallelCalls; i++) {
      if (depth !== 'full' || page + i <= depth) {
        pagePromises.push(
          fetchPage(
            propertyExternalId,
            reviewPageUrl,
            endpointUrl,
            headers,
            page + i,
            i === 0 ? pageSize1 : pageSize2,
            i !== 0,
            allReviews
          ).catch(() => {
            errorEncountered = true
          })
        )
      }
    }

    await Promise.allSettled(pagePromises)

    if (errorEncountered) {
      break
    }

    page += parallelCalls
  } while (depth === 'full' || page <= depth)

  return allReviews
}
function createRequestBody (propertyExternalId, page, pageSize, isReviewPage) {
  return {
    hotelId: propertyExternalId,
    providerId: 332,
    demographicId: 0,
    page,
    pageSize,
    sorting: 1,
    providerIds: [332],
    isReviewPage,
    isCrawlablePage: true,
    filters: {
      language: [],
      room: []
    },
    searchKeyword: '',
    searchFilters: []
  }
}
