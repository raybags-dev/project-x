import * as cheerio from 'cheerio'
import { HEADERS } from '../data/headers/headers.js'
import { logger } from '../loggers/logger.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { USER_MODEL } from '../models/user.js'
import { validateEndpointDomain } from '../utilities/validateBaseUrl.js'

import axiosInstance from '../downloader/HTTPEngine.js'

export async function generateGoogleProfile (req, res) {
  try {
    const frontFacingUrl = req.body.frontFacingUrl
    if (!frontFacingUrl) return res.status(400).json('bad request')
    const isValid = validateEndpointDomain(frontFacingUrl, req)
    if (!isValid)
      return res.status(400).json('Error: Bad request - Invalid baseUrl!')

    const { email, isAdmin, userId } = await req.locals.user

    if (isAdmin) {
      const user = await USER_MODEL.findOne({ email })
      if (!user) return res.status(404).json('User not found!')

      const isSubscribed = await USER_MODEL.getSubscriptionStatus(userId)
      if (!isSubscribed)
        return res.status(400).json({
          status: 'failed',
          message:
            'user is unsubscribed - review profile creation requires active subscription'
        })

      const httpData = await downloadGoogleInitialPage(frontFacingUrl)

      if (httpData.failed) {
        return res.status(404).json(httpData)
      }

      const {
        googleCrawlerUrl,
        hotelName,
        computedUrl1,
        computedUrl2,
        allEndpoints,
        propertyType
      } = httpData

      const existingProfile = await PROFILE_MODEL.findOne(
        {
          reviewSiteSlug: 'google-com',
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
          message: 'Account already has a google profile!',
          profile: existingProfile
        })
      }

      const siteProfileData = await PROFILE_MODEL.create({
        reviewSiteSlug: 'google-com',
        originalUrl: frontFacingUrl,
        url: googleCrawlerUrl,
        userId: user.userId,
        propertyEndpoints: allEndpoints,
        propertyType,
        nextRunType: 'INITIAL',
        computedUrl: computedUrl1 || computedUrl2,
        name: hotelName
      })

      await USER_MODEL.setSubStatus(user, true)
      return res.status(200).json(siteProfileData)
    }
    res.status(400).json({
      status: 'failed',
      message:
        'Profile could not be saved. Please the property url and try again!'
    })
  } catch (e) {
    logger(e, 'error')
    if (e.response && e.response.status === 404) {
      return res
        .status(404)
        .json({ status: 'failed', message: 'Resource not found' })
    }

    if (e.status === 404 || e.code === 'ENOENT') {
      return res.status(404).json({ status: 'failed', message: 'Not found' })
    }

    res.status(500).json({ status: 'failed', message: 'Internal server error' })
  }
}
// *********** ====== **********
async function downloadGoogleInitialPage (frontFacingUrl) {
  const headers = HEADERS.googleHeadersGenProfile
  const response = await axiosInstance.get(frontFacingUrl, { headers })

  if (!response || !response.data) {
    logger('No response data received', 'error')
    return null
  }

  const htmlContent = response.data
  const $ = cheerio.load(htmlContent)

  const hotelFeatureId = $('[data-hotel-feature-id]').attr(
    'data-hotel-feature-id'
  )
  const restaurantFeatureId = $('[data-feature-id]').attr('data-feature-id')
  let featureId = hotelFeatureId || restaurantFeatureId
  featureId = featureId.replace(':', '%3A').trim()

  if (!featureId) {
    return { failed: true, response: response.data }
  }

  const urlPart1 = 'https://www.google.com/travel/hotels'
  const urlPart2 =
    $('a[data-hveid="CAMQAg"][target="_blank"]')?.attr('data-href')?.trim() ||
    ''
  const urlPart3 = '/reviews?q='
  const urlPart4AddressString =
    $('a[aria-label="Directions"]')?.attr('href') || ''
  const addressMatch = urlPart4AddressString.match(/[?&]daddr=([^&]+)/)
  const urlPart4 = addressMatch ? decodeURIComponent(addressMatch[1]) : ''
  const urlPart5 = '&lrd='
  const urlPart6 = '&utm_campaign=sharing&utm_medium=link&utm_source=htls'
  const googleCrawlerUrl = `${urlPart1}${urlPart2}${urlPart3}${urlPart4}${urlPart5}${featureId}${urlPart6}`

  const hotelName1 = $('h1.FNkAEc.o4k8l[role="heading"][tabindex="-1"]')
    .text()
    .trim()
  const hotelName2 = $('span.FjC1We.ogfYpf.zUyrwb.uhWwJd').text().trim()
  const hotelName3 = $('div.LHVjrc').text().trim()
  const immWithHotelName = $('img.iSN49d.us9x4d')
  const hotelName4 = immWithHotelName.attr('alt')
  const hotelName5 = $('h3.LC20lb.MBeuO.DKV0Md').first().text().trim()
  const hotelName6 = $('a.CQYfx.hAP9Pd.gEBR9d').text().trim()

  let hotelName7 = ''
  const divWithDataKey = $('div[data-encoded-entity-key]')
  if (divWithDataKey.length > 0) {
    hotelName7 = divWithDataKey.attr('data-query')
  }

  const hotelName =
    (hotelName1 && hotelName1) ||
    (hotelName2 && hotelName2) ||
    (hotelName3 && hotelName3) ||
    (hotelName4 && hotelName4) ||
    (hotelName5 && hotelName5) ||
    (hotelName6 && hotelName6) ||
    (hotelName7 && hotelName7)

  const urlConstruct1 = hotelName.split(' ').join('+')
  const computedUrl2 = `https://www.google.com/travel/search?q=${urlConstruct1}&lrd=${featureId},1`

  const part1 = $('a[data-hveid][href^="/travel/hotels/entity"]').attr('href')
  const base_url = $('base').attr('href')
  const computedUrl1 = part1
    ? base_url.replace(/\/$/, '') + part1.replace(/\?/, '/reviews?')
    : null

  const allEndpoints = {}
  $('a[jsname="UWckNb"]')?.each((index, element) => {
    const href = $(element).attr('href')
    const parsedUrl = new URL(href)
    const domainName = parsedUrl?.hostname?.split('.')?.slice(-2)?.join('.')
    allEndpoints[domainName] = href
  })

  return {
    googleCrawlerUrl,
    hotelName,
    computedUrl1,
    computedUrl2,
    allEndpoints,
    propertyType: (hotelFeatureId && 'HOTEL') || 'RESTAURANT'
  }
}
