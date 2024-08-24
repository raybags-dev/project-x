import * as cheerio from 'cheerio'

import { USER_MODEL } from '../models/user.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { logger } from '../utils/logger.js'

export async function parseReviewHtml (html, urlAgent, req, propertyProfileUrl) {
  try {
    const $ = cheerio.load(html)
    const reviews = []
    const userId = await req.locals.user.userId
    const { name: propertyName, reviewSiteSlug } = await PROFILE_MODEL.findOne({
      userId
    })
    const userIDD = await USER_MODEL.findOne({ userId })

    function parseSubratings (element, processedCategories) {
      const subratings = []
      element
        .find('.k8MTF span:not([aria-hidden="true"])')
        .each((index, subratingElement) => {
          const subratingText = $(subratingElement).first().text().trim()
          const [category, rating] = subratingText
            .split(':')
            .map(part => part.trim())

          if (category && rating && !processedCategories.has(category)) {
            const numericRating = parseInt(rating, 10)
            subratings.push({ key: category, value: String(numericRating) })
            processedCategories.add(category)
          }
        })
      return subratings
    }
    function parseReviewText (expandedSection) {
      const originalText = expandedSection.find('.k8MTF').prev().text().trim()
      const translatedText = expandedSection.find('div.d6SCIc').text().trim()

      if (originalText && originalText.includes('(Original)')) {
        const startIndex =
          originalText.indexOf('(Original)') + '(Original)'.length
        return originalText.substring(startIndex).trim()
      } else if (
        translatedText &&
        translatedText.includes('(Translated by Google)')
      ) {
        const startIndex =
          translatedText.indexOf('(Translated by Google)') +
          '(Translated by Google)'.length
        return translatedText.substring(startIndex).trim()
      } else {
        return expandedSection.text().trim()
      }
    }

    $(
      '.gws-localreviews__unified-review, .gws-localreviews__google-review'
    ).each((index, element) => {
      const username = $(element).find('.TSUbDb a').text().trim()
      const siteSlug = 'google-com'

      const authorProfileUrl = $(element).find('.TSUbDb a').attr('href')

      let originalanchor1 = $(element).find(
        'div[style="display:none;vertical-align:top"]'
      )
      let originaText1 = originalanchor1
        .find('span[data-expandable-section][tabindex="-1"]')
        .first()
        .text()
        .trim()
      // ********************
      const mainAnchor = $(element)
      const originalReviewText = mainAnchor
        .find(
          'div[style="display:none;vertical-align:top"] div.Jtu6Td span span span span.review-full-text'
        )
        .first()
        .text()
        .trim()
      // ********************
      const reviewText = parseReviewText(
        $(element).find('span[data-expandable-section]')
      )

      let rowMainReviewBody = originalReviewText || originaText1 || reviewText
      const mainReviewBodyRegex =
        /^(.*?)\s*(Rooms: \d\/\d\s*\|\s*Service: \d\/\d\s*\|\s*Location: \d\/\d)/s
      const mainReviewBodyMatch = rowMainReviewBody.match(mainReviewBodyRegex)
      const mainReviewBody = mainReviewBodyMatch
        ? mainReviewBodyMatch[1]
        : rowMainReviewBody

      const commonReviewProperties = {
        author: username,
        authorProfileUrl,
        userId: userIDD.userId,
        authorExternalId: extractAuthorExternalId(element),
        reviewSiteSlug: siteSlug,
        reviewBody: mainReviewBody,
        propertyProfileUrl,
        reviewDate: parseReviewDate(
          $(element).find('.Qhbkge').last().text().trim() ||
            $(element).find('.dehysf.lTi8oc').last().text().trim()
        ),
        urlAgent,
        propertyName,
        propertyResponse: {
          body: parsePropertyResponse(element),
          responseDate: processResponseDate(element)
        }
      }

      if ($(element).hasClass('gws-localreviews__unified-review')) {
        // Hotel review specific properties
        const rating = $(element).find('.pjemBf').text().replace('/5', '')
        const tripType1 = $(element)
          .find('.PV7e7 span:last-child')
          .first()
          .text()
          .trim()
        const tripType2 = $(element).find('.PV7e7 span').first().text().trim()
        const tripType = tripType1 || tripType2

        const subratingsHotel = parseSubratings($(element), new Set())
        reviews.push({
          ...commonReviewProperties,
          rating,
          tripType,
          subratings: subratingsHotel
        })
      } else {
        // Restaurant review specific properties
        const restaurantRating = $(element)
          .find('span.lTi8oc.z3HNkc')
          .attr('aria-label')
        const restaurant_rating = extractNumericRating(restaurantRating)

        const restaurantTriptype = parseRestaurantTripType(
          $(element).find('.PV7e7')
        )

        const subratingsRestaurant = parseSubratings($(element), new Set())
        const userReviewCount = extractUserReviewCount($(element), $)

        reviews.push({
          ...commonReviewProperties,
          rating: restaurant_rating,
          tripType: restaurantTriptype,
          subratings: subratingsRestaurant,
          authorReviewCount: userReviewCount
        })
      }
    })
    return reviews
  } catch (e) {
    logger(`${e}: from <parseReviewHtml> function`, 'error')
  }
}
function extractAuthorExternalId (element) {
  const $ = cheerio.load(element)

  const anchorTagRestaurant = $(element).find('div.FGlxyd a.Msppse')
  const anchorTagHotel = $(element).find('div.TSUbDb.w6Pmwe a')

  const profileHrefHotel = anchorTagHotel.attr('href')
  const profileHrefRestaurant = anchorTagRestaurant.attr('href')

  const externalIdmatchHotel =
    profileHrefHotel && profileHrefHotel.match(/contrib\/([^?]+)/)
  const externalIdmatchRestaurant =
    profileHrefRestaurant && profileHrefRestaurant.match(/contrib\/([^?]+)/)

  const hotelExternalID = externalIdmatchHotel ? externalIdmatchHotel[1] : null
  const restaurantExternalID = externalIdmatchRestaurant
    ? externalIdmatchRestaurant[1]
    : null

  return hotelExternalID || restaurantExternalID
}
function extractNumericRating (ariaLabel) {
  const ratingRegex = /Rated\s+(\d[\d,]*)\s+out/
  const ratingMatch = ariaLabel.match(ratingRegex)
  return ratingMatch
    ? parseFloat(ratingMatch[1].replace(',', '.'))
    : parseFloat('1.0') // adding constant for missing rating
}

function parseReviewDate (relativeDate) {
  if (relativeDate) {
    const processedRelativeDate = relativeDate.replace(/^an?\s+/i, '1 ')
    const match = processedRelativeDate.match(/(\d+)\s+(\w+)\s+ago/)

    if (match) {
      const [, value, unit] = match
      const currentDate = new Date()
      switch (unit.toLowerCase()) {
        case 'days':
        case 'day':
          currentDate.setDate(currentDate.getDate() - parseInt(value))
          break
        case 'weeks':
        case 'week':
          currentDate.setDate(currentDate.getDate() - parseInt(value) * 7)
          break
        case 'months':
        case 'month':
          currentDate.setMonth(currentDate.getMonth() - parseInt(value))
          break
        case 'years':
        case 'year':
          currentDate.setFullYear(currentDate.getFullYear() - parseInt(value))
          break
        case 'hours':
        case 'hour':
          currentDate.setHours(currentDate.getHours() - parseInt(value))
          break
        case 'minutes':
        case 'minute':
          currentDate.setMinutes(currentDate.getMinutes() - parseInt(value))
          break
        case 'seconds':
        case 'second':
          currentDate.setSeconds(currentDate.getSeconds() - parseInt(value))
          break
        default:
          return null
      }

      const year = currentDate.getFullYear()
      const month = String(currentDate.getMonth() + 1).padStart(2, '0')
      const day = String(currentDate.getDate()).padStart(2, '0')
      const mainoutput = `${year}-${month}-${day}`

      return mainoutput
    }
  }

  return relativeDate || null
}
function processResponseDate (element) {
  const $ = cheerio.load(element)
  const responseDiv = $('div:contains("Response from the owner")')

  if (responseDiv.length > 0) {
    const spanWithClass = responseDiv.find('span.pi8uOe').first()

    if (spanWithClass.length > 0) {
      const textInsideSpan = spanWithClass.text()
      const processedDate = parseReviewDate(textInsideSpan)

      return processedDate
    }
  }
  return null
}
function parsePropertyResponse (element) {
  const $ = cheerio.load(element)

  let propertyResponse = $(element).find('.d6SCIc').first().text().trim()
  let newPropertyResponse = ''

  if (propertyResponse && propertyResponse.includes('(Original)')) {
    const startIndexResponse =
      propertyResponse.indexOf('(Original)') + '(Original)'.length
    propertyResponse = propertyResponse.substring(startIndexResponse).trim()
  }
  newPropertyResponse = propertyResponse.replace(/\|/g, '').trim()

  const OriginalPropertyResponse = $('span.d6SCIc[style*="display:none"]')
    .text()
    .trim()

  return (
    (OriginalPropertyResponse && OriginalPropertyResponse) ||
    (newPropertyResponse && newPropertyResponse) ||
    null
  )
}
function parseRestaurantTripType (tripTypeElement) {
  const tripTypeValue1 = tripTypeElement
    .find('span:nth-child(1)')
    .first()
    .text()
    .trim()
  const tripTypeValue2 = tripTypeElement
    .find('span:nth-child(3)')
    .first()
    .text()
    .trim()
  return tripTypeValue1 || tripTypeValue2
}
function extractUserReviewCount (element, $) {
  const reviewCountContainer = $(element)
  reviewCountContainer.find('.Aohxlc').remove()

  const reviewCountText = reviewCountContainer
    .find('.A503be')
    .first()
    .text()
    .trim()

  let reviewCount
  if (reviewCountText.includes('reviews')) {
    const reviewCountRegex = /(\d+) reviews/
    const match = reviewCountText.match(reviewCountRegex)
    reviewCount = match ? parseInt(match[1].replace('.', '')) : null
  } else {
    const numericReviewRegex = /(\d+)/
    const match = reviewCountText.match(numericReviewRegex)
    reviewCount = match ? parseInt(match[1].replace('.', '')) : null
  }
  return reviewCount
}
