import * as cheerio from 'cheerio'
import bindToContext from '../../../middleware/generalHandlers.js'
import { logger } from '../../loggers/logger.js'
import { holdOnFor } from '../utilities.js'

const utilityRegistry = {
  // ***** GOOGLE.COM *****
  getReviewText: function (element, anchors) {
    for (const selector of anchors) {
      let text = element.find(selector).first().text().trim()
      if (text) {
        text = text.replace(/\b(Service|Location|Rooms): \d\/\d\b/g, '').trim()
        text = text.replace(/\s*\|\s*/g, ' ')
        return text
      }
    }
    return ''
  },
  extractAuthorExternalId: function (element, cheerio) {
    const $ = cheerio.load(element)

    const anchorTagRestaurant = $(element).find('div.FGlxyd a.Msppse')
    const anchorTagHotel = $(element).find('div.TSUbDb.w6Pmwe a')

    const profileHrefHotel = anchorTagHotel.attr('href')
    const profileHrefRestaurant = anchorTagRestaurant.attr('href')

    const externalIdmatchHotel =
      profileHrefHotel && profileHrefHotel.match(/contrib\/([^?]+)/)
    const externalIdmatchRestaurant =
      profileHrefRestaurant && profileHrefRestaurant.match(/contrib\/([^?]+)/)

    const hotelExternalID = externalIdmatchHotel
      ? externalIdmatchHotel[1]
      : null
    const restaurantExternalID = externalIdmatchRestaurant
      ? externalIdmatchRestaurant[1]
      : null

    return hotelExternalID || restaurantExternalID
  },
  extractNumericRating: function (ariaLabel) {
    const ratingRegex = /Rated\s+(\d[\d,]*)\s+out/
    const ratingMatch = ariaLabel.match(ratingRegex)
    return ratingMatch
      ? parseFloat(ratingMatch[1].replace(',', '.'))
      : parseFloat('1.0')
  },
  parseReviewDate: function (relativeDate) {
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
  },
  extractStayInfo: function (url) {
    if (!url) return
    const match = url.match(/staydates=(\d{4}_\d{2}_\d{2})_(\d{4}_\d{2}_\d{2})/)

    if (!match) return null

    const [, checkInStr, checkOutStr] = match

    const formatToISO = str => str.replace(/_/g, '-')
    const checkInDate = new Date(formatToISO(checkInStr))
    const checkOutDate = new Date(formatToISO(checkOutStr))

    const msPerNight = 1000 * 60 * 60 * 24
    const numberOfNights = Math.round((checkOutDate - checkInDate) / msPerNight)

    return {
      stayDate: formatToISO(checkInStr),
      numberOfNights
    }
  },
  processResponseDate: function (element, cheerio) {
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
  },
  parsePropertyResponse: function (element, cheerio) {
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
  },
  parseRestaurantTripType: function (tripTypeElement) {
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
  },
  extractUserReviewCount: function (element, $) {
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
  },
  extractFromElements: async function (
    page,
    reviewList = [],
    reviewElementSelector
  ) {
    const reviewElements = await page.$$(reviewElementSelector)

    for (let i = extractedReviews.length; i < reviewElements.length; i++) {
      const element = reviewElements[i]

      try {
        const htmlContent = await page.evaluate(el => el.outerHTML, element)
        const $ = cheerio.load(htmlContent)

        const author =
          $('span.k5TI0 a[target="_blank"]').text().trim() || 'Anonymous'
        const authorProfileUrl = $('span.k5TI0 a[target="_blank"]').attr('href')
        const rating = $('div.GDWaad').text().replace('/5', '').trim()
        const reviewBody =
          $('div.K7oBsc').text().trim() ||
          $('div.K7oBsc div span').text().trim() ||
          null
        const reviewDateString = $('span.k5TI0 span.iUtr1').text().trim()
        const reviewDate = parseReviewDate(reviewDateString)

        const stayDateObject = extractStayInfo(authorProfileUrl)
        const stayDate = stayDateObject?.stayDate || null
        const numberOfNights = stayDateObject?.numberOfNights || null

        reviewList.push({
          author,
          authorProfileUrl,
          rating,
          reviewBody,
          reviewDate,
          stayDate,
          numberOfNights
        })
      } catch (err) {
        logger(`Error extracting review: ${err}`)
      }
    }

    extractedReviews = extractedReviews.concat(reviewList)
    return reviewList.length > 0
  },
  parseSubratings: function (element, processedCategories) {
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
  },
  parseReviewText: function (expandedSection) {
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
  },
  // *********** 👇🏾 WORKING MODEL 👇🏾 *********** //
  waitForGoogleReviewXHR: async function (page, timeout = 3000) {
    return page.waitForResponse(
      response =>
        response
          .url()
          .startsWith(
            'https://www.google.com/_/TravelFrontendUi/data/batchexecute'
          ) &&
        response.request().method() === 'POST' &&
        response.status() === 200,
      { timeout }
    )
  },
  handleGoogleCookieDialogue: async function (page) {
    const cookieDismissed = await page.evaluate(() => {
      try {
        const cookieSpan = Array.from(document.querySelectorAll('span')).find(
          el =>
            el.textContent.trim().toLowerCase() === 'accept all' &&
            el.getAttribute('jsname') === 'V67aGc' &&
            el.offsetParent !== null
        )
        if (cookieSpan) {
          cookieSpan.click()
          return true
        }
        return false
      } catch (err) {
        console.log(`Cookie dialog error: ${err}`)
        return false
      }
    })
    if (cookieDismissed) {
      console.log('✅ Cookie dialog dismissed.')
      await holdOnFor(5000)
      return cookieDismissed
    }
  },
  handleGoogleReviewTabBtn: async function (page) {
    if (!page) throw new Error('web page objects is null or undeflined')

    const reviewsButtonClicked = await page.evaluate(() => {
      const reviewTab = document.querySelector(
        'div[aria-label="Reviews"][id="reviews"][role="tab"]'
      )
      if (reviewTab) {
        reviewTab.click()
        return true
      }
      return false
    })

    if (!reviewsButtonClicked) throw new Error('"Review Tab" button not found')
    console.log('Clicked "Reviews" button')
  },
  handleGoogleReviewFIlterSelection: async function (page) {
    if (!page) throw new Error('web page objects is null or undeflined')

    const allReviewsClicked = await page.evaluate(async () => {
      try {
        const elements = Array.from(
          document.querySelectorAll('span, button, a, div')
        )

        const targets = elements.filter(
          el => el.textContent.trim() === 'All reviews'
        )

        if (targets.length >= 2) {
          targets[1].click()
        } else if (targets.length === 1) {
          targets[0].click()
        } else {
          return false
        }

        await new Promise(res => setTimeout(res, 2000))

        const googleOption = Array.from(
          document.querySelectorAll('[role="option"][aria-label="Google"]')
        ).find(el => el.offsetParent !== null)

        if (googleOption) {
          googleOption.click()
          return true
        }

        return false
      } catch (e) {
        console.warn(`Error clicking All reviews or Google button: ${e}`)
        return false
      }
    })
    if (!allReviewsClicked)
      throw new Error('"All reviews Tab" trigger not found')
    console.log('Clicked "All reviews" button')
  },
  handleRecentReviewFIlterSelection: async function (page) {
    if (!page) throw new Error('web page objects is null or undeflined')

    const mostRecentClicked = await page.evaluate(async () => {
      try {
        const sortDropdownTrigger = Array.from(
          document.querySelectorAll(
            '[aria-label="Review Sort Options"] [jsname="LgbsSe"]'
          )
        ).find(el => el.offsetParent !== null)

        if (!sortDropdownTrigger) return false

        sortDropdownTrigger.click()

        await new Promise(res => setTimeout(res, 2000))

        const mostRecentOption = Array.from(
          document.querySelectorAll('[role="option"][aria-label="Most recent"]')
        ).find(el => el.offsetParent !== null)

        if (mostRecentOption) {
          mostRecentOption.click()
          return true
        }

        return false
      } catch (e) {
        console.error(`Error clicking Most helpful or Most recent: ${e}`)
        return false
      }
    })

    if (!mostRecentClicked) throw new Error('"Most recent" option not found')

    console.log('(dropdown triggered) selected "Most recent"')
  }
}

bindToContext(utilityRegistry)
export default utilityRegistry
