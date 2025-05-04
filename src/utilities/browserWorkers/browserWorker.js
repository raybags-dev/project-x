import * as cheerio from 'cheerio'
import { saveObjectToS3 } from '../../blobStorage/aws/s3BucketUtility.js'
import { handleAzureBlobAndPipeline } from '../../blobStorage/azure/pipelines/azureOchestrator.js'
import { logger } from '../../loggers/logger.js'
import parseGoogleReview from '../parser/parsers.js'

// async function extractAndParseFromElements (
//   page,
//   reviewElementSelector,
//   extractedReviews,
//   saveObjectToS3,
//   handleAzureBlobAndPipeline,
//   user
// ) {
//   const reviewElements = await page.$$(reviewElementSelector)
//   let newReviews = []
//   const slug = user?.slug || 'google'
//   const userId = user.userId
//   const id = user.id

//   for (let i = extractedReviews.length; i < reviewElements.length; i++) {
//     const element = reviewElements[i]

//     try {
//       const htmlContent = await page.evaluate(el => el.outerHTML, element)
//       const $ = cheerio.load(htmlContent)

//       const reviewData = await parseGoogleReview($)

//       newReviews.push({
//         ...reviewData
//       })
//     } catch (err) {
//       logger(`Error extracting review: ${err}`, 'warn')
//     }
//   }

//   extractedReviews.push(...newReviews)
//   saveObjectToS3(newReviews, false)
//   handleAzureBlobAndPipeline(newReviews, [slug, userId, id], false)
//   return {
//     hasNew: newReviews.length > 0,
//     reviews: newReviews
//   }
// }
// export default async function fetchAndSaveGoogleReviews (
//   page,
//   totalPagesToFetch,
//   user,
//   options = {}
// ) {
//   let allReviews = []
//   const { timeout = 30000, maxRetries = 3, retryDelay = 1500 } = options

//   const reviewElementSelector = 'div.Svr5cf.bKhjM'
//   const scrollableSelector = 'div[jsname="UcPrk"][class="v85cbc"]'
//   const extractedReviews = [true]

//   const initialReviews = await extractAndParseFromElements(
//     page,
//     reviewElementSelector,
//     extractedReviews,
//     saveObjectToS3,
//     handleAzureBlobAndPipeline,
//     user
//   )

//   allReviews.push(...initialReviews.reviews)

//   let continueScrolling = true
//   let retryCount = 0
//   let pagesDetected = 0

//   await page.waitForSelector(reviewElementSelector, { timeout: 10000 })

//   logger(`Initiating scrolling to fetch ${totalPagesToFetch} pages of reviews.`)

//   while (continueScrolling) {
//     try {
//       const responseDetectedPromise = new Promise(resolve => {
//         const handleResponse = response => {
//           const url = response.url()
//           const method = response.request().method()
//           const status = response.status()

//           logger(
//             `[BACKGROUND REQUEST-RESPONSES] URL: ${url}, Method: ${method}, Status: ${status}`
//           )

//           if (
//             url.startsWith(
//               'https://www.google.com/_/TravelFrontendUi/data/batchexecute'
//             ) &&
//             method === 'POST' &&
//             status === 200
//           ) {
//             page.off('response', handleResponse)
//             resolve(true)
//           }
//         }
//         page.on('response', handleResponse)
//       })

//       const timeoutPromise = new Promise(resolve =>
//         setTimeout(() => resolve(false), timeout)
//       )

//       const responseDetected = await Promise.race([
//         responseDetectedPromise,
//         timeoutPromise
//       ])

//       logger(`responseDetected: ${responseDetected}`)

//       if (responseDetected) {
//         logger(
//           `Google API POST request detected. Pages detected: ${
//             pagesDetected + 1
//           }/${totalPagesToFetch}`
//         )
//         pagesDetected++
//         const newReviewsLoaded = await extractAndParseFromElements(
//           page,
//           reviewElementSelector,
//           extractedReviews,
//           saveObjectToS3,
//           handleAzureBlobAndPipeline,
//           user
//         )

//         logger(
//           `Extracted ${
//             newReviewsLoaded.hasNew ? 'new' : 'no new'
//           } reviews after request.`
//         )
//         allReviews.push(...newReviewsLoaded.reviews)

//         await new Promise(resolve => setTimeout(resolve, 1000))
//         retryCount = 0

//         if (pagesDetected >= totalPagesToFetch) {
//           logger(
//             `Reached target page count (${totalPagesToFetch}). Performing one more scroll to check for more content.`
//           )
//           await page.evaluate(anchor => {
//             const element = document.querySelector(anchor)
//             if (element) {
//               element.scrollIntoView({ behavior: 'smooth', block: 'end' })
//             }
//           }, scrollableSelector)
//           await new Promise(resolve => setTimeout(resolve, 1500))
//           logger('Final scroll performed after reaching page limit. Stopping.')
//           continueScrolling = false
//         }
//       } else {
//         logger(
//           `Google API POST request NOT detected after scroll. Retry attempt: ${
//             retryCount + 1
//           }/${maxRetries + 1}`
//         )
//         if (retryCount < maxRetries) {
//           logger('Retrying scroll sequence...')
//           await page.evaluate(anchor => {
//             const element = document.querySelector(anchor)
//             if (element) {
//               element.scrollBy(0, -element.clientHeight / 2)
//             }
//           }, scrollableSelector)
//           await new Promise(resolve => setTimeout(resolve, retryDelay))

//           for (let i = 0; i < 3; i++) {
//             await page.evaluate(anchor => {
//               const element = document.querySelector(anchor)
//               if (element) {
//                 element.scrollBy(0, element.clientHeight)
//               }
//             }, scrollableSelector)
//             await new Promise(resolve => setTimeout(resolve, retryDelay))
//           }
//           retryCount++
//         } else {
//           logger('Max retry attempts reached. Stopping scroll.', 'warn')
//           continueScrolling = false
//         }
//       }

//       await page.evaluate(anchor => {
//         const element = document.querySelector(anchor)
//         if (element) {
//           element.scrollIntoView({ behavior: 'smooth', block: 'end' })
//         }
//       }, scrollableSelector)
//       await new Promise(resolve => setTimeout(resolve, 500))
//     } catch (error) {
//       logger(`Error during scroll with page limit: ${error}`, 'warn')
//       continueScrolling = false
//     }
//   }

//   logger('Review fetching complete.')

//   return allReviews
// }

async function extractAllFromElements (
  page,
  reviewElementSelector,
  saveObjectToS3,
  handleAzureBlobAndPipeline,
  user
) {
  // Force a small pause before extraction to ensure the page is stable
  await new Promise(resolve => setTimeout(resolve, 500))

  const reviewElements = await page.$(reviewElementSelector)
  let newReviews = []
  const slug = user?.slug || 'google'
  const userId = user.userId
  const id = user.id

  logger(`Found ${reviewElements.length} review elements on page.`)

  // Process ALL elements, starting from index 0, with explicit logging
  for (let i = 0; i < reviewElements.length; i++) {
    const element = reviewElements[i]
    logger(`Processing review element ${i + 1}/${reviewElements.length}`)

    try {
      const htmlContent = await page.evaluate(el => el.outerHTML, element)
      const $ = cheerio.load(htmlContent)

      const reviewData = await parseGoogleReview($)
      logger(`Successfully extracted review data for element ${i + 1}`)

      newReviews.push({
        ...reviewData
      })
    } catch (err) {
      logger(`Error extracting review ${i + 1}: ${err}`, 'warn')
    }
  }

  saveObjectToS3(newReviews, false)
  handleAzureBlobAndPipeline(newReviews, [slug, userId, id], false)
  return {
    hasNew: newReviews.length > 0,
    reviews: newReviews
  }
}

// For subsequent review extractions, use the original tracking approach
async function extractNewFromElements (
  page,
  reviewElementSelector,
  extractedCount,
  saveObjectToS3,
  handleAzureBlobAndPipeline,
  user
) {
  const reviewElements = await page.$$(reviewElementSelector)
  let newReviews = []
  const slug = user?.slug || 'google'
  const userId = user.userId
  const id = user.id

  logger(
    `Found ${reviewElements.length} total elements, starting from index ${extractedCount}`
  )

  // Only process elements we haven't seen before
  for (let i = extractedCount; i < reviewElements.length; i++) {
    const element = reviewElements[i]

    try {
      const htmlContent = await page.evaluate(el => el.outerHTML, element)
      const $ = cheerio.load(htmlContent)

      const reviewData = await parseGoogleReview($)

      newReviews.push({
        ...reviewData
      })
    } catch (err) {
      logger(`Error extracting review: ${err}`, 'warn')
    }
  }

  saveObjectToS3(newReviews, false)
  handleAzureBlobAndPipeline(newReviews, [slug, userId, id], false)
  return {
    hasNew: newReviews.length > 0,
    reviews: newReviews
  }
}

export default async function fetchAndSaveGoogleReviews (
  page,
  totalPagesToFetch,
  user,
  options = {}
) {
  let allReviews = []
  const { timeout = 30000, maxRetries = 3, retryDelay = 1500 } = options

  const reviewElementSelector = 'div.Svr5cf.bKhjM'
  const scrollableSelector = 'div[jsname="UcPrk"][class="v85cbc"]'

  // Make sure reviews are visible first
  await page.waitForSelector(reviewElementSelector, { timeout: 10000 })
  logger(
    'Reviews are loaded. Taking time to extract ALL reviews from the first page.'
  )

  // Pause to ensure the page is fully loaded and stable
  await new Promise(resolve => setTimeout(resolve, 2000))

  // Count how many review elements are available before extraction
  const reviewCount = await page.evaluate(selector => {
    return document.querySelectorAll(selector).length
  }, reviewElementSelector)

  logger(`Found ${reviewCount} review elements on first page before extraction`)

  // Extract ALL reviews from the first page using specialized function
  const initialReviews = await extractAllFromElements(
    page,
    reviewElementSelector,
    saveObjectToS3,
    handleAzureBlobAndPipeline,
    user
  )

  allReviews.push(...initialReviews.reviews)
  logger(
    `Successfully extracted ${initialReviews.reviews.length} reviews from first page.`
  )

  // Pause again after extraction to ensure everything is processed
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Exit early if we only need one page
  if (totalPagesToFetch <= 1) {
    logger('Only one page requested. Stopping after initial extraction.')
    return allReviews
  }

  // Track how many reviews we've already processed
  let extractedCount = initialReviews.reviews.length

  let continueScrolling = true
  let retryCount = 0
  let pagesDetected = 1 // Start at 1 since we've already processed the first page

  logger(
    `Starting scroll sequence after processing first page with ${extractedCount} reviews.`
  )

  logger(`Initiating scrolling to fetch ${totalPagesToFetch} pages of reviews.`)

  while (continueScrolling) {
    try {
      const responseDetectedPromise = new Promise(resolve => {
        const handleResponse = response => {
          const url = response.url()
          const method = response.request().method()
          const status = response.status()

          logger(
            `[BACKGROUND REQUEST-RESPONSES] URL: ${url}, Method: ${method}, Status: ${status}`
          )

          if (
            url.startsWith(
              'https://www.google.com/_/TravelFrontendUi/data/batchexecute'
            ) &&
            method === 'POST' &&
            status === 200
          ) {
            page.off('response', handleResponse)
            resolve(true)
          }
        }
        page.on('response', handleResponse)
      })

      const timeoutPromise = new Promise(resolve =>
        setTimeout(() => resolve(false), timeout)
      )

      // Scroll to load more reviews
      await page.evaluate(anchor => {
        const element = document.querySelector(anchor)
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'end' })
        }
      }, scrollableSelector)
      await new Promise(resolve => setTimeout(resolve, 500))

      const responseDetected = await Promise.race([
        responseDetectedPromise,
        timeoutPromise
      ])

      logger(`responseDetected: ${responseDetected}`)

      if (responseDetected) {
        logger(
          `Google API POST request detected. Pages detected: ${
            pagesDetected + 1
          }/${totalPagesToFetch}`
        )
        pagesDetected++

        // Extract only new reviews using the count-based approach
        const newReviewsLoaded = await extractNewFromElements(
          page,
          reviewElementSelector,
          extractedCount,
          saveObjectToS3,
          handleAzureBlobAndPipeline,
          user
        )

        logger(
          `Extracted ${
            newReviewsLoaded.hasNew ? 'new' : 'no new'
          } reviews after request. Found ${
            newReviewsLoaded.reviews.length
          } new reviews.`
        )

        // Update our total count of extracted reviews
        extractedCount += newReviewsLoaded.reviews.length
        allReviews.push(...newReviewsLoaded.reviews)

        await new Promise(resolve => setTimeout(resolve, 1000))
        retryCount = 0

        if (pagesDetected >= totalPagesToFetch) {
          logger(
            `Reached target page count (${totalPagesToFetch}). Performing one more scroll to check for more content.`
          )
          await page.evaluate(anchor => {
            const element = document.querySelector(anchor)
            if (element) {
              element.scrollIntoView({ behavior: 'smooth', block: 'end' })
            }
          }, scrollableSelector)
          await new Promise(resolve => setTimeout(resolve, 1500))
          logger('Final scroll performed after reaching page limit. Stopping.')
          continueScrolling = false
        }
      } else {
        logger(
          `Google API POST request NOT detected after scroll. Retry attempt: ${
            retryCount + 1
          }/${maxRetries + 1}`
        )
        if (retryCount < maxRetries) {
          logger('Retrying scroll sequence...')
          await page.evaluate(anchor => {
            const element = document.querySelector(anchor)
            if (element) {
              element.scrollBy(0, -element.clientHeight / 2)
            }
          }, scrollableSelector)
          await new Promise(resolve => setTimeout(resolve, retryDelay))

          for (let i = 0; i < 3; i++) {
            await page.evaluate(anchor => {
              const element = document.querySelector(anchor)
              if (element) {
                element.scrollBy(0, element.clientHeight)
              }
            }, scrollableSelector)
            await new Promise(resolve => setTimeout(resolve, retryDelay))
          }
          retryCount++
        } else {
          logger('Max retry attempts reached. Stopping scroll.', 'warn')
          continueScrolling = false
        }
      }
    } catch (error) {
      logger(`Error during scroll with page limit: ${error}`, 'warn')
      continueScrolling = false
    }
  }

  logger('Review fetching complete.')

  return allReviews
}
