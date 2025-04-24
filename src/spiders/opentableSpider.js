import { HEADERS } from '../data/headers/headers.js'
import axiosInstance from '../downloader/HTTPEngine.js'
import { logger } from '../loggers/logger.js'
import { validateResponse } from '../utilities/generalUtilities.js'

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
  const maxConcurrency = 40

  // Process in batches of maxConcurrency
  for (let batchStart = 1; batchStart <= depth; batchStart += maxConcurrency) {
    const batchEnd = Math.min(batchStart + maxConcurrency - 1, depth)
    logger(`Processing batch from page ${batchStart} to ${batchEnd}`, 'info')

    // Create promises for each page in current batch
    const batchPromises = Array.from(
      { length: batchEnd - batchStart + 1 },
      (_, index) => {
        logger(`Fetching: ${endpointUrl}`, 'info')

        const pageNumber = batchStart + index
        return fetchPageData(
          endpointUrl,
          createRequestBody(propertyExternalId, pageNumber),
          headers
        ).catch(error => {
          logger(`Error fetching page ${pageNumber}: ${error.message}`, 'error')
          return [] // Return empty array on error
        })
      }
    )

    // Wait for all promises in the batch to settle
    const results = await Promise.allSettled(batchPromises)

    // Process results with proper page number tracking
    results.forEach((result, index) => {
      const pageNumber = batchStart + index

      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        logger(
          `Fetched ${result.value.length} reviews from page ${pageNumber}`,
          'info'
        )
        allReviews.push(...result.value)
      } else {
        logger(`Failed to fetch reviews from page ${pageNumber}`, 'warn')
      }
    })
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
