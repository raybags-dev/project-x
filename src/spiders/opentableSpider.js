import { HEADERS } from '../_data_/headers/headers.js'
import { logger } from '../loggers/logger.js'
import { validateResponse } from '../utils/generalUtilities.js'
import axiosInstance from '../utils/proxy.js'

export async function fetchOpentableReviews (
  depth = 1,
  propertyExternalId,
  userProfile
) {
  try {
    const { url, reviewPageUrl } = await userProfile
    const endpointUrl = reviewPageUrl || url
    const headers = { ...HEADERS.opentableHeadersGenReviews, method: 'POST' }

    logger(`Fetching reviews with depth: ${depth}...`, 'info')

    const allReviews = await fetchPerPage(
      propertyExternalId,
      endpointUrl,
      headers,
      depth
    )

    logger(`Fetched ${allReviews.length} reviews successfully.`, 'info')
    return allReviews
  } catch (error) {
    logger(`Error fetching reviews: ${error.message}`, 'error')
    return []
  }
}
async function fetchPerPage (propertyExternalId, endpointUrl, headers, depth) {
  const allReviews = []
  const maxConcurrency = 5

  // Process in batches of maxConcurrency
  for (let batchStart = 1; batchStart <= depth; batchStart += maxConcurrency) {
    const batchEnd = Math.min(batchStart + maxConcurrency - 1, depth)
    logger(`Processing batch from page ${batchStart} to ${batchEnd}`, 'info')

    const batchPromises = []

    // Create a batch of promises
    for (let skip = batchStart; skip <= batchEnd; skip++) {
      batchPromises.push(
        fetchPageData(
          endpointUrl,
          createRequestBody(propertyExternalId, skip),
          headers
        ).catch(error => {
          logger(
            `Error fetching page at skip=${skip}: ${error.message}`,
            'error'
          )
          return []
        })
      )
    }

    const results = await Promise.allSettled(batchPromises)
    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const pageNumber = batchStart + i

      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        logger(
          `Fetched ${result.value.length} reviews from page ${pageNumber}`,
          'info'
        )
        allReviews.push(...result.value)
      } else {
        logger(`Failed to fetch reviews from page ${pageNumber}`, 'warn')
      }
    }
  }

  logger(`Final total reviews collected: ${allReviews.length}`, 'info')
  return allReviews
}
async function fetchPageData (endpointUrl, requestBody, headers) {
  try {
    const response = await axiosInstance.post(endpointUrl, requestBody, {
      headers
    })

    if (!validateResponse(response)) return

    if (response.status === 200) {
      const reviewsObj =
        response.data?.data?.restaurant?.reviewSearchResults?.reviews || []
      logger(`Fetched ${reviewsObj.length} reviews from the response.`, 'info')
      return reviewsObj
    }

    return []
  } catch (error) {
    logger(`Error fetching page: ${error.message}`, 'error')
    throw error
  }
}
function createRequestBody (hotelId, pageIndex) {
  return {
    operationName: 'ReviewSearchResults',
    variables: {
      prioritiseUserLanguage: false,
      gpid: 0,
      restaurantId: hotelId,
      page: pageIndex,
      pageSize: 10,
      sortBy: 'newestReview',
      searchTerm: '',
      highlightFormat: 'index'
    },
    extensions: {
      persistedQuery: {
        version: 1,
        sha256Hash:
          '69e9257b5aae02ba419a2d9596b4fd1f35b6608940cf84bfb563347408ec3834'
      }
    }
  }
}
