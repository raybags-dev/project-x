import * as cheerio from 'cheerio'

import { USER_MODEL } from '../models/user.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { logger } from '../utils/logger.js'

export async function parseBookingReviewHtml (
  html,
  urlAgent,
  req,
  propertyProfileUrl
) {
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
      const reviewTextAnchor = [
        'div[style="display:none;vertical-align:top"] div.Jtu6Td span span span span.review-full-text',
        'div[style="vertical-align:top"] div.Jtu6Td span span span[data-expandable-section]',
        'span.review-full-text'
      ]

      const originalReviewText = getReviewText(mainAnchor, reviewTextAnchor)
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
