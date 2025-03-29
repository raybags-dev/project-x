import { devLogger } from '../loggers/devLogger.js'
import { logger } from '../loggers/logger.js'

const processingRequests = new Map()

const TIMEOUT_MS = 5 * 60 * 1000

export function throttleHandler (options = {}) {
  const defaultOptions = {
    endpointKey: null,
    timeout: TIMEOUT_MS
  }

  const config = { ...defaultOptions, ...options }

  return async function (req, res, next) {
    const key = config.endpointKey || req.originalUrl || req.url

    if (processingRequests.has(key)) {
      logger(`Request to ${key} is already in progress. Throttling...`, 'warn')
      return res.status(429).json({
        status: 'busy',
        isDone: false,
        message:
          'Request acknowledged. Please wait for completion, terminate the ongoing process, or retry after the current operation concludes.'
      })
    }

    const timeoutId = setTimeout(() => {
      if (processingRequests.has(key)) {
        logger(
          `Request to ${key} timed out after ${config.timeout}ms. Clearing lock.`,
          'warn'
        )
        processingRequests.delete(key)
      }
    }, config.timeout)

    processingRequests.set(key, timeoutId)

    try {
      const originalEnd = res.end
      res.end = function (chunk, encoding) {
        clearTimeout(processingRequests.get(key))
        processingRequests.delete(key)
        return originalEnd.call(this, chunk, encoding)
      }

      return next()
    } catch (error) {
      clearTimeout(processingRequests.get(key))
      processingRequests.delete(key)

      devLogger(`Error during operation for ${key}: ${error.message}`, 'error')

      if (!res.headersSent) {
        res.status(500).json({ success: false, message: error.message })
      }

      return next(error)
    }
  }
}
export function getProcessingStatus () {
  return {
    activeRequests: Array.from(processingRequests.keys()),
    count: processingRequests.size
  }
}
export function clearProcessingFlag (key) {
  if (processingRequests.has(key)) {
    clearTimeout(processingRequests.get(key))
    processingRequests.delete(key)
    logger(`Processing flag for ${key} manually cleared`, 'info')
    return true
  }
  return false
}
export function resetAllProcessingFlags () {
  for (const timeoutId of processingRequests.values()) {
    clearTimeout(timeoutId)
  }
  processingRequests.clear()
  logger('All processing flags have been reset', 'warn')
}
function generateEndpointKey (routePath) {
  return routePath
    .replace(/^\/raybags\/v1\/review-crawler\//, '')
    .replace(/\//g, '-')
    .replace(/:/g, '')
    .trim()
    .toLowerCase()
}
export function withThrottle (routePath, timeout) {
  return throttleHandler({
    endpointKey: generateEndpointKey(routePath),
    timeout: timeout
  })
}
