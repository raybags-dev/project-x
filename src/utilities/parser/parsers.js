import { logger } from '../../loggers/logger.js'
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
function parsePropertyResponse ($, element) {
  const propertyResponseSection = $(element).find('div.n7uVJf')
  const paragraphs = propertyResponseSection.find('p.JOzlvd')

  const responseLines = []

  paragraphs.each((_, p) => {
    const line = $(p).text().trim()
    if (line) responseLines.push(line)
  })

  return responseLines.length ? responseLines.join('\n') : null
}
function processResponseDate ($, element) {
  const responseContainer = $(element).find('.n7uVJf').first()
  const spans = responseContainer.find('span')

  if (spans.length > 1) {
    return $(spans[1]).text().trim() || null
  }
  return null
}
function parseSubratings ($, element) {
  const subratingsContainer = $(element).find('.X4nL7d').first()
  const subratings = {}

  subratingsContainer.find('.dA5Vzb').each((_, el) => {
    const category = $(el).find('span.uTU5Ac').text().trim()
    const rating = $(el).find('span').last().text().trim()

    if (category && rating) {
      subratings[category] = rating
    }
  })

  if (Object.keys(subratings).length === 0) return []

  const subratingsList = []
  for (const [key, value] of Object.entries(subratings)) {
    subratingsList.push({ key, value })
  }

  return subratingsList
}
function parseExtras ($, element) {
  const extrasContainer = $(element).find('.X4nL7d')
  const extras = {}

  extrasContainer.children('div').each((_, div) => {
    const label = $(div).find('span').first().text().trim()
    const description = $(div).find('span').last().text().trim()

    // Skip if the description looks like a float (e.g., 3.0, 2.5)
    if (label && description && !/^\d+\.\d+$/.test(description)) {
      extras[label] = description
    }
  })

  return Object.keys(extras).length > 0 ? extras : null
}
function extractUserIdFromUrl (url) {
  const match = url.match(/contrib\/([^/?]+)/)
  return match ? match[1] : null
}
function extractPreferredBodyText (reviewText) {
  if (!reviewText || typeof reviewText !== 'string') return ''

  const lowerText = reviewText.toLowerCase()

  // Step 1: If '(Original)' exists with text before it
  const originalIndex = lowerText.indexOf('(original)')
  if (originalIndex > 0) {
    const afterOriginal = reviewText.slice(originalIndex + '(Original)'.length)
    return afterOriginal.trim()
  }

  // Step 2: If '… Read more' or variations exist, remove all before it
  const readMoreMatch = reviewText.match(/…\s*read more(.*)$/i)
  if (readMoreMatch) {
    return readMoreMatch[1].trim()
  }

  // Step 3: If it ends with '… Read more', remove that ending
  const readMoreEnding = /…\s*read more\s*$/i
  if (readMoreEnding.test(reviewText)) {
    return reviewText.replace(readMoreEnding, '').trim()
  }

  //Fallback
  return reviewText.trim()
}

function validateObjectFields (obj) {
  if (!obj) return null
  const isValid = Object.values(obj).every(
    value => value !== null && value !== ''
  )
  return isValid ? obj : null
}
export default async function parseGoogleReview ($) {
  try {
    let reviews = []

    $('.Svr5cf.bKhjM[data-hveid]').each((index, element) => {
      const username =
        $(element).find('span.k5TI0 a[target="_blank"]').text().trim() ||
        'Anonymous'
      const siteSlug = 'google-com'
      const authorProfileUrl = $(element)
        .find('span.k5TI0 a[target="_blank"]')
        .attr('href')

      const bodyString =
        $(element).find('div.K7oBsc').text().trim() ||
        $('div.K7oBsc div span').text().trim() ||
        'Guest did not provided details'

      const revieBody = bodyString && extractPreferredBodyText(bodyString)
      const cleanReviewBody = revieBody || null

      const responseString = parsePropertyResponse($, element)
      const cleanedResponseBody =
        (responseString && extractPreferredBodyText(responseString)) || null

      const authorExternalId = extractUserIdFromUrl(authorProfileUrl)
      const reviewDateString = $(element)
        .find('span.k5TI0 span.iUtr1')
        .text()
        .trim()

      const formatedReviewDate = parseReviewDate(reviewDateString)

      const resDate = processResponseDate($, element)
      const formatedResDate = resDate && parseReviewDate(resDate)

      const responseObject = validateObjectFields({
        body: cleanedResponseBody,
        responseDate: formatedResDate
      })

      const rating = $(element)
        .find('div.GDWaad')
        .text()
        .replace('/5', '')
        .trim()

      const tripType = $(element).find('div.ThUm5b span').text().trim() || null
      const subratings = parseSubratings($, element)
      const highlights = parseExtras($, element)

      const commonReviewProperties = {
        author: username,
        authorProfileUrl,
        rating,
        tripType,
        authorExternalId,
        reviewSiteSlug: siteSlug,
        reviewBody: cleanReviewBody,
        reviewDate: formatedReviewDate,
        subratings: subratings,
        miscellaneous: highlights,
        propertyResponse: responseObject
      }

      reviews = {
        ...commonReviewProperties
      }
    })

    return reviews
  } catch (e) {
    logger(`${e}: from <parseGoogleReview> function`, 'error')
    return []
  }
}
