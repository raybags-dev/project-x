import { HEADERS } from '../data/headers/headers.js'
import axiosInstance from '../downloader/HTTPEngine.js'
import { logger } from '../loggers/logger.js'
import { validateResponse } from '../utilities/generalUtilities.js'

export async function fetchExpediaReviews (
  depth = 1,
  propertyExternalId,
  userProfile
) {
  const pageSize = 10
  try {
    const { url, reviewPageUrl, metadata } = await userProfile

    const endpointUrl = reviewPageUrl || url
    const headers = { ...HEADERS.expediaHeadersGenReviews, method: 'POST' }

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
  const maxConcurrency = 40 // Increased from 5 to 40

  for (let batchStart = 0; batchStart < depth; batchStart += maxConcurrency) {
    // Calculate how many pages to fetch in this batch (not exceeding depth)
    const pagesInBatch = Math.min(maxConcurrency, depth - batchStart)

    // Create array of promises for concurrent execution
    const batchPromises = Array.from({ length: pagesInBatch }, (_, i) => {
      logger(`Fetching: ${endpointUrl}`, 'info')
      const pageIndex = batchStart + i
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
        return { failed: true }
      })
    })

    // Execute batch concurrently
    const results = await Promise.allSettled(batchPromises)

    // Check for errors and break if needed
    if (results.some(res => res.status === 'rejected')) {
      logger('Encountered rejected promises, stopping pagination', 'error')
      break
    }

    // Check if all requests failed
    const allFailed = results.every(
      res => res.status === 'fulfilled' && res.value && res.value.failed
    )

    if (allFailed) {
      logger('All requests in batch failed, stopping pagination', 'error')
      break
    }
  }

  return allReviews
}

async function fetchPageData (endpointUrl, requestBody, headers) {
  try {
    const response = await axiosInstance.post(endpointUrl, requestBody, {
      headers
    })

    if (!validateResponse(response)) return

    const isResponseSuccess = response.status == 200

    if (isResponseSuccess) {
      const reviewsObj = await response.data?.[0]?.data?.propertyInfo
        ?.reviewInfo
      return reviewsObj
    }
    return null
  } catch (error) {
    logger(`Error fetching page: ${error.message}`, 'error')
    return null
  }
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

  const requestBody = createRequestBody(propertyExternalId, skip, metadata)
  const responseData = await fetchPageData(endpointUrl, requestBody, headers)

  if (!responseData) return

  allReviews.push(...responseData.reviews)
  logger(`Collected ${allReviews.length} reviews`, 'info')
}

function createRequestBody (hotelId, skip, metadata) {
  const { regionalId, locale, duaid } = metadata
  return [
    {
      operationName: 'PropertyFilteredReviewsQuery',
      variables: {
        context: {
          siteId: 1,
          locale: locale || 'en_US',
          eapid: 0,
          tpid: 1,
          currency: 'USD',
          device: {
            type: 'DESKTOP'
          },
          identity: {
            duaid: duaid || '',
            authState: 'ANONYMOUS'
          },
          privacyTrackingState: 'CAN_TRACK',
          debugContext: {
            abacusOverrides: []
          }
        },
        propertyId: hotelId.toString(),
        searchCriteria: {
          primary: {
            dateRange: null,
            rooms: [
              {
                adults: 2
              }
            ],
            destination: {
              regionId: regionalId
            }
          },
          secondary: {
            booleans: [
              { id: 'includeRecentReviews', value: false },
              { id: 'includeRatingsOnlyReviews', value: true },
              { id: 'overrideEmbargoForIndividualReviews', value: true },
              { id: 'isFilteredSummary', value: true }
            ],
            counts: [
              { id: 'startIndex', value: skip || 0 },
              { id: 'size', value: 10 }
            ],
            selections: [
              { id: 'sortBy', value: 'NEWEST_TO_OLDEST' },
              { id: 'searchTerm', value: '' },
              { id: 'popularMention', value: '' }
            ]
          }
        }
      },
      extensions: {
        persistedQuery: {
          version: 1,
          sha256Hash:
            'd1b8f924e9d87b676ebefbea89ae7a220aea4466d63f5e275ea623b6cc49933a'
        }
      }
    }
  ]
}
