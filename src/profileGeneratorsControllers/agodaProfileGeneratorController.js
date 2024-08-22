import { PROFILE_MODEL } from '../models/profileModel.js'
import { USER_MODEL } from '../models/user.js'
import { HEADERS } from '../_data_/headers/headers.js'
import { getAgodaCreds, callAgodaEndpoint } from '../configurations/agoda.js'
import { logger } from '../utils/logger.js'

export async function generateAgodaProfile (req, res) {
  try {
    const frontFacingUrl = req.body.frontFacingUrl
    logger(frontFacingUrl, 'info')

    if (!frontFacingUrl) return res.status(400).json('Bad request')

    const { email, isAdmin } = await req.locals.user

    if (isAdmin) {
      const user = await USER_MODEL.findOne({ email })
      if (!user) return res.status(404).json('User not found!')

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

      // Create a copy of the headers and modify it
      const headers = { ...HEADERS.agodaApiHeaders, method: 'POST' }

      const responseData = await callAgodaEndpoint(
        endpointUrl,
        requestBody,
        headers
      )

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
    }
  } catch (error) {
    logger(`Error generating Agoda profile: ${error.message}`, 'error')
    res.status(500).json('Internal server error')
  }
}
export async function findTotalIndexById (providerList, id) {
  if (!providerList.length) return
  for (const provider of providerList) {
    if (provider.id === id) {
      return provider.totalIndex
    }
  }
  return null
}
