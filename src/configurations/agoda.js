import axios from 'axios'
import { HEADERS } from '../_data_/headers/headers.js'
import { findTotalIndexById } from '../profileGeneratorsControllers/agodaProfileGeneratorController.js'
/**
 *
 * @param {string} url - The Agoda API endpoint URL.
 * @param {object} requestBody - The request body to be sent with the API request.
 * @param {object} headers - The headers to be included in the API request.
 * @returns {Promise<object>} - A promise that resolves to the response data from the Agoda API.
 */

export async function getAgodaCreds (req, res) {
  try {
    const frontFacingUrl = req.body.frontFacingUrl
    const { agodaHeadersGenProfile } = HEADERS

    const response = await axios.get(frontFacingUrl, {
      headers: agodaHeadersGenProfile
    })
    if (response.status === 200) {
      const body = response.data

      const hotelId1Regex = /hotelId:(\d+)/
      const matchHotelId1 = body.match(hotelId1Regex)
      const hotelId1 = matchHotelId1 ? matchHotelId1[1] : null

      const hotelId2Regex = /propertyId:(\d+)/
      const matchHotelId2 = body.match(hotelId2Regex)
      const hotelId2 = matchHotelId2 ? matchHotelId2[1] : null

      const hotelId3Regex = /hotel_id=(\d+)/
      const matchHotelId3 = body.match(hotelId3Regex)
      const hotelId3 = matchHotelId3 ? matchHotelId3[1] : null

      return hotelId1 || hotelId2 || hotelId3
    }
  } catch (error) {
    console.error('Error: ', 'hotelId could not be fetched - ', error.message)
  }
}
export async function callAgodaEndpoint (url, requestBody, headers) {
  try {
    const response = await axios.post(url, requestBody, { headers })
    return response.data
  } catch (error) {
    console.error('Error calling Agoda API:', error.message)
  }
}
export async function fetchAgodaReviews (
  depth = 1,
  propertyExternalId,
  userProfile
) {
  const pageSize1 = 20
  const pageSize2 = 70

  try {
    const { reviewPageUrl } = await userProfile

    const endpointUrl =
      'https://www.agoda.com/api/cronos/property/review/ReviewComments'
    const headers = { ...HEADERS.agodaApiHeaders, method: 'POST' }

    const parallelCalls = Math.max(2, Math.min(depth, 2))
    console.log(`Running with ${parallelCalls} parallel calls...`)

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

    console.log('All pages fetched.')
    return allReviews
  } catch (error) {
    console.error('Error calling Agoda API:', error.message)
  }
}
async function fetchPageData (endpointUrl, requestBody, headers) {
  try {
    const response = await axios.post(endpointUrl, requestBody, { headers })
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
  console.log(`Fetching page: ${page}...`)

  const requestBody = createRequestBody(
    propertyExternalId,
    page,
    pageSize,
    isReviewPage
  )

  if (reviewPageUrl) {
    requestBody.isReviewPage = true
  }

  try {
    const { comments, providerList } = await fetchPageData(
      endpointUrl,
      requestBody,
      headers
    )
    const totalReviewsCount = await findTotalIndexById(providerList, 332)

    allReviews.push(...comments)

    console.log(
      `Done fetching page: ${page}. Total reviews collected: ${allReviews.length}/${totalReviewsCount}`
    )

    return allReviews.length >= totalReviewsCount
  } catch (error) {
    if (
      error.response &&
      error.response.status === 429 &&
      error.response.data &&
      error.response.data.errorCode === 'TOO_MANY_REQUEST'
    ) {
      console.log('TOO_MANY_REQUEST detected. Try again later.')
      return true
    } else {
      console.error('Error fetching page:', error.message)
      throw error
    }
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
            i !== 0, // i === 0 for the first call, i.e., isReviewPage for pageSize1
            allReviews
          ).catch(() => {
            errorEncountered = true
          })
        )
      }
    }

    await Promise.all(pagePromises)

    if (errorEncountered) {
      console.log('Aborting due to error. Try again later.')
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
