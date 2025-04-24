import { HEADERS } from '../data/headers/headers.js'
import axiosInstance from '../downloader/HTTPEngine.js'
import { logger } from '../loggers/logger.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { validateResponse } from '../utilities/generalUtilities.js'
import {
  getAgodaCreds,
  validateAndAuthorizeUser
} from '../utilities/utilities.js'

export async function generateAgodaProfile (req, res) {
  try {
    const validation = await validateAndAuthorizeUser(req, res)
    if (validation.error) return
    const { frontFacingUrl, user } = validation

    const hotelId = await getAgodaCreds(req, res)

    const endpointUrl =
      'https://www.agoda.com/api/cronos/property/review/ReviewComments'

    const requestBody = {
      hotelId: hotelId,
      providerId: 332,
      demographicId: 0,
      page: 1,
      pageSize: 20,
      sorting: 1,
      providerIds: [332],
      isReviewPage: false,
      isCrawlablePage: true,
      filters: {
        language: [],
        room: []
      },
      searchKeyword: '',
      searchFilters: []
    }

    const headers = { ...HEADERS.agodaHeadersGenReviews, method: 'POST' }

    logger('Creating agoda profile...', 'info')
    const responseData = await callAgodaEndpoint(
      endpointUrl,
      requestBody,
      headers
    )

    if (!responseData) {
      return res.status(404).json({
        status: 'failed',
        message: 'Empty response received. Try again later'
      })
    }
    logger(`${responseData && 'Processing response...'}..`, 'info')
    const existingProfile = await PROFILE_MODEL.findOne(
      {
        reviewSiteSlug: 'agoda-com',
        userId: user.userId
      },
      {
        createdTimestamp: 0,
        createdAt: 0,
        updatedAt: 0,
        nextRunType: 0,
        __v: 0
      }
    )
    if (existingProfile) {
      return res.status(400).json({
        status: 'failed',
        message: 'Account already has an agoda profile!',
        profile: existingProfile
      })
    }

    const propertyNameRegex = /\/en-gb\/(.+?)\/hotel\/.+\.html/
    const propertyNameMatch = frontFacingUrl.match(propertyNameRegex)
    const propertyName1 = propertyNameMatch ? propertyNameMatch[1] : null

    const propertyNameRegex2 = /https:\/\/www\.agoda\.com\/(.+?)\/hotel\//
    const propertyNameRegex2Match = frontFacingUrl.match(propertyNameRegex2)
    const propertyName2 = propertyNameRegex2Match
      ? propertyNameRegex2Match[1]
      : null

    const propertyName = propertyName1 ? propertyName1 : propertyName2

    const cleanedPropertyName = propertyName
      ? propertyName.replace(/-/g, ' ')
      : null

    if (!responseData || responseData == undefined) return null

    const { hotelID, providerList, reviewPageUrl } = responseData

    const totalreviewCount = providerList
    const reviewCount = await findTotalIndexById(totalreviewCount, 332)
    const siteProfileData = await PROFILE_MODEL.create({
      reviewSiteSlug: 'agoda-com',
      originalUrl: frontFacingUrl,
      url: frontFacingUrl,
      reviewPageUrl,
      userId: user.userId,
      propertyType: 'HOTEL',
      nextRunType: 'INITIAL',
      propertyExternalId: hotelID,
      propertyReviewCount: reviewCount,
      computedUrl: frontFacingUrl,
      name: cleanedPropertyName
    })

    res.status(200).json({
      message: 'Agoda profile generated successfully',
      data: siteProfileData
    })
  } catch (error) {
    if (!res.headersSent) {
      return res
        .status(500)
        .json({ status: 'failed', message: 'Internal server error' })
    }
    logger(error.message, 'error')
  }
}
async function callAgodaEndpoint (url, requestBody, headers) {
  if (!url) return logger('url or requestBody missing...', 'warn')
  try {
    const response = await axiosInstance.post(url, requestBody, { headers })
    if (!validateResponse(response)) return

    return response.data
  } catch (error) {
    logger(`Error calling Agoda API: ${error}`, 'error')
  }
}
export async function findTotalIndexById (providerList, id) {
  if (!providerList.length) return logger(`Total count not found`, 'error')
  for (const provider of providerList) {
    if (provider.id === id) {
      return provider.totalIndex
    }
  }
  return null
}
