import { HEADERS } from '../data/headers/headers.js'
import axiosInstance from '../downloader/HTTPEngine.js'
import { logger } from '../loggers/logger.js'
import { validateResponse } from '../utilities/generalUtilities.js'

export async function fetchTripReviews (
  depth = 1,
  propertyExternalId,
  userProfile
) {
  const pageSize = 10
  try {
    const { url, reviewPageUrl, metadata } = await userProfile

    const endpointUrl = reviewPageUrl || url
    const headers = { ...HEADERS.tripHeadersGenReviews, method: 'POST' }

    logger(`Fetching reviews with depth: ${depth}...`, 'info')

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
  const maxConcurrency = 40

  // Process pages in batches of maxConcurrency
  for (
    let currentPage = 1;
    currentPage <= depth;
    currentPage += maxConcurrency
  ) {
    // Create a batch of promises for concurrent execution
    const batchPromises = []

    // Calculate end of current batch (not exceeding depth)
    const batchEnd = Math.min(currentPage + maxConcurrency - 1, depth)

    // Create promises for each page in current batch
    for (let page = currentPage; page <= batchEnd; page++) {
      logger(`Fetching: ${endpointUrl}`, 'info')
      batchPromises.push(
        fetchPageData(
          endpointUrl,
          createRequestBody(propertyExternalId, page, metadata),
          headers
        ).catch(error => {
          logger(`Error fetching page ${page}: ${error.message}`, 'error')
          return [] // Return empty array on error to maintain consistency
        })
      )
    }

    // Wait for all promises in the batch to settle
    const results = await Promise.allSettled(batchPromises)

    // Process results
    for (const result of results) {
      if (result.status === 'fulfilled' && Array.isArray(result.value)) {
        allReviews.push(...result.value)
      }
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
      const reviewsObj = response.data?.data?.commentList
      return reviewsObj
    }
    return null
  } catch (error) {
    logger(`Error fetching page: ${error.message}`, 'error')
    return null
  }
}
function createRequestBody (hotelId, pageIndex, metadata) {
  const { cid, sid, aid, pageId, vid, ouid, locale } = metadata

  return {
    hotelId: hotelId,
    pageIndex: pageIndex,
    pageSize: 10,
    repeatComment: 1,
    needStaticInfo: false,
    functionOptions: [
      'IntegratedTARating',
      'hidePicAndVideoAgg',
      'TripReviewsToServerOnline',
      'IntegratedExpediaList',
      'tripShuffled',
      'taAdvisorCount',
      'filterComment',
      'noShowNewExpedia'
    ],
    orderBy: 1,
    head: {
      platform: 'PC',
      cver: '0',
      cid: cid || '1697628965150.288h9e',
      bu: 'IBU',
      group: 'trip',
      aid: aid || '1078328',
      sid: sid || '2036522',
      ouid: ouid || 'ctag.hash.nnrohn2hu7wy',
      locale: locale || 'en-US',
      timezone: '1',
      currency: 'USD',
      pageId: pageId || '10320668147',
      vid: vid || '1697628965150.288h9e',
      guid: '',
      isSSR: false
    }
  }
}
