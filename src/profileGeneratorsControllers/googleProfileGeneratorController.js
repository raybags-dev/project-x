import axios from 'axios'
import * as cheerio from 'cheerio'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { USER_MODEL } from '../models/user.js'
import { HEADERS } from '../_data_/headers/headers.js'
import { logger } from '../utils/logger.js'

export async function generateGoogleProfile (req, res) {
  try {
    const frontFacingUrl = req.body.frontFacingUrl
    if (!frontFacingUrl) return res.status(400).json('bad request')

    const { email, isAdmin, userId } = await req.locals.user
    if (isAdmin) {
      const user = await USER_MODEL.findOne({ email })
      if (!user) return res.status(404).json('User not found!')

      const headers = HEADERS.google_headers
      const response = await axios.get(frontFacingUrl, { headers })
      const htmlContent = response.data
      const $ = cheerio.load(htmlContent)

      const hotelFeatureId = $('[data-hotel-feature-id]').attr(
        'data-hotel-feature-id'
      )
      const restaurantFeatureId = $('[data-feature-id]').attr('data-feature-id')
      const featureId =
        (hotelFeatureId && hotelFeatureId) || restaurantFeatureId

      if (!featureId)
        return res.status(404).json({ failed: true, response: response.data })

      const encodedFeatureId = featureId.replace(':', '%3A')
      const googleCrawlerUrl = `https://www.google.com/async/reviewSort?yv=3&async=feature_id:${encodedFeatureId},review_source:Google,sort_by:newestFirst,partner_start_index:0,is_owner:false,filter_text:,_pms:s,_fmt:pc,next_page_token:`

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

      const part1 = $('a[data-hveid][href^="/travel/hotels/entity"]').attr(
        'href'
      )
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
        propertyType: (hotelFeatureId && 'HOTEL') || 'RESTAURANT',
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
    res.status(500).json({ status: 'failed', message: 'Internal server error' })
  }
}
