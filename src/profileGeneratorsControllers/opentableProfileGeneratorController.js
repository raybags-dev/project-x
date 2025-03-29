//generateOpentableProfile

import * as cheerio from 'cheerio'
import { HEADERS } from '../_data_/headers/headers.js'
import { logger } from '../loggers/logger.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { USER_MODEL } from '../models/user.js'
import axiosInstance from '../utils/proxy.js'
import { validateAndAuthorizeUser } from '../utils/utilities.js'
import { validateResponse } from '../utils/generalUtilities.js'

export async function generateOpentableProfile (req, res) {
  try {
    const validation = await validateAndAuthorizeUser(req, res)
    if (validation.error) return
    const { frontFacingUrl, user } = validation

    const response = await axiosInstance.get(frontFacingUrl, {
      headers: HEADERS.opentableHeadersGenProfile
    })
    if (!validateResponse(response)) return

    const opentableHtmlContent = response.data
    const $ = cheerio.load(opentableHtmlContent)

    const restaurantIdMain = $('li[data-rid]').attr('data-rid')?.trim()
    const restaurantId1 = extractStringFromHTML($, /\?rid=(\d+)&/)
    const restaurantId2 = extractStringFromHTML($, /\{"restaurantId":(\d+)/)
    const restaurantId3 = extractStringFromHTML($, /"dishId":":(\d+)-/)

    const restaurantId =
      (restaurantIdMain && restaurantIdMain) ||
      (restaurantId1 && restaurantId1) ||
      (restaurantId2 && restaurantId2) ||
      (restaurantId3 && restaurantId3) ||
      null
    if (!restaurantId)
      return res.status(404).json({ failed: true, response: response.data })

    const updatedFrontFacingUrl = frontFacingUrl || req.url

    const opentableCrawlerUrl =
      'https://www.opentable.com/dapi/fe/gql?optype=query&opname=ReviewSearchResults'

    const restaurantName1Extract = $('title')?.text()?.trim()
    const restaurantName1 = extractData(restaurantName1Extract, /^(.*?)\s*-\s*/)
    const restaurantName2 = extractStringFromHTML(
      $,
      /data-name="How\s*is\s*(.*?)\s*rated\?"/
    )
    const restaurantName =
      (restaurantName2 && restaurantName2) ||
      (restaurantName1 && restaurantName1) ||
      null

    const prop_type = extractStringFromHTML($, /"source":"(.*?)"/)
    prop_type?.toLowerCase()

    const review_count1 = extractStringFromHTML(
      $,
      /allTimeTextReviewCount":(\d+),/
    )
    const review_count2 = extractStringFromHTML($, /"totalCount":(\d+)/)
    const review_count3 = extractStringFromHTML($, /"reviewCount":(\d+)\}/)
    const review_count4 = extractStringFromHTML($, /"reviewCount":(\d+)\}/)
    const review_count5 = extractStringFromHTML($, />(\d+)\s*Reviews/)

    const reviewCount =
      (review_count1 && review_count1) ||
      (review_count2 && review_count2) ||
      (review_count3 && review_count3) ||
      (review_count4 && review_count4) ||
      (review_count5 && review_count5) ||
      null

    const propertyAddress = extractStringFromHTML(
      $,
      /class="_0nB0b1ILlGA-" href="https:\/\/www\.google\.com\/maps[^"]*".*?>(.*?)<\/a>/
    )

    const description = $('title')?.text()?.trim()

    const star_rating1 = extractStringFromHTML($, /"rating":\s*(\d+\.\d+)/)
    const star_rating2 = extractStringFromHTML(
      $,
      /"AggregateRating","ratingValue":\s*(\d+(\.\d+)?)/
    )
    const starRating =
      (star_rating1 && star_rating1) || (star_rating2 && star_rating2) || null

    const phone1 = extractStringFromHTML(
      $,
      /href="tel:(\(?\d{3}\)?[\s-]?\d{3}[\s-]?\d{4})"/
    )
    const phone2 = extractStringFromHTML(
      $,
      /rel="noopener noreferrer">\(?(\d{3})\)?[\s-]?(\d{3})[\s-]?(\d{4})<\/a>/
    )
    const phone = (phone1 && phone1) || (phone2 && phone2) || null

    const locale = $('html').attr('lang')

    const metadata = {}
    metadata.propertyAddress = propertyAddress || null
    metadata.starRating = starRating || null
    metadata.propertyDescription = description || null
    metadata.phone = phone
    metadata.locale = locale
    metadata.computedUrl = updatedFrontFacingUrl

    const existingProfile = await PROFILE_MODEL.findOne(
      {
        reviewSiteSlug: 'opentable-com',
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
      const hasChanges =
        existingProfile.propertyReviewCount !== reviewCount ||
        existingProfile.propertyExternalId !== restaurantId ||
        existingProfile.name !== restaurantName

      if (hasChanges) {
        existingProfile.propertyReviewCount = reviewCount
        existingProfile.propertyExternalId = restaurantId
        existingProfile.name = restaurantName
        existingProfile.originalUrl = updatedFrontFacingUrl
        existingProfile.url = opentableCrawlerUrl
        existingProfile.propertyType = prop_type
        existingProfile.computedUrl = updatedFrontFacingUrl
        existingProfile.reviewPageUrl = updatedFrontFacingUrl

        await existingProfile.save()

        await USER_MODEL.setSubStatus(user, true)
        return res.status(200).json(existingProfile)
      }

      return res.status(400).json({
        status: 'failed',
        message: 'Account already has a opentable-com profile',
        profile: existingProfile
      })
    }

    // Create new profile if no existing document
    const siteProfileData = await PROFILE_MODEL.create({
      reviewSiteSlug: 'opentable-com',
      originalUrl: updatedFrontFacingUrl,
      url: opentableCrawlerUrl,
      userId: user.userId,
      metadata: metadata,
      propertyReviewCount: reviewCount,
      propertyExternalId: restaurantId,
      propertyType: prop_type,
      reviewPageUrl: opentableCrawlerUrl,
      computedUrl: updatedFrontFacingUrl,
      name: restaurantName
    })

    await USER_MODEL.setSubStatus(user, true)
    return res.status(200).json(siteProfileData)
  } catch (e) {
    logger(e, 'error')
    res.status(500).json({ status: 'failed', message: 'Internal server error' })
  }
}
function extractData (str, regex) {
  if (!str) return
  const match = str && str.match(regex)
  return match ? match[1].replace(/_/g, ' ') : null
}
function extractStringFromHTML ($, regex) {
  const htmlString = $.html()
  const match = htmlString.match(regex)
  return match ? match[1] : null
}
