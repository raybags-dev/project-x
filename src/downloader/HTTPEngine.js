import axios from 'axios'
import 'dotenv/config'
import { HttpsProxyAgent } from 'https-proxy-agent'
import { devLogger } from '../loggers/devLogger.js'
import { logger } from '../loggers/logger.js'

const {
  PROXY_USERNAME,
  PROXY_PASSWORD,
  PROXY_HOST,
  PROXY_PORT,
  REQUEST_TIMEOUT = 10000,
  MAX_RETRIES = 3
} = process.env

// Create axios instance with default configuration
const axiosInstance = axios.create({
  timeout: parseInt(REQUEST_TIMEOUT, 10)
})

/**
 * Creates an HTTPS proxy agent for secure requests
 * @returns {HttpsProxyAgent|null} Proxy agent or null if proxy config is incomplete
 */
const getProxyAgent = () => {
  if (!PROXY_USERNAME || !PROXY_PASSWORD || !PROXY_HOST || !PROXY_PORT) {
    logger('Proxy configuration incomplete, using direct connection', 'warn')
    return null
  }

  try {
    const proxyUrl = `http://${PROXY_USERNAME}:${PROXY_PASSWORD}@${PROXY_HOST}:${PROXY_PORT}`
    return new HttpsProxyAgent(proxyUrl)
  } catch (error) {
    logger(`Failed to create proxy agent: ${error.message}`, 'error')
    return null
  }
}

/**
 * Logs request body safely with truncation for large payloads
 * @param {any} data Request data
 * @param {number} maxLength Maximum length to log before truncating
 */
const safelyLogRequestBody = (data, maxLength = 1000) => {
  if (!data) return

  try {
    let bodyStr = typeof data === 'object' ? JSON.stringify(data) : String(data)
    if (bodyStr.length > maxLength) {
      bodyStr = `${bodyStr.substring(0, maxLength)}... (truncated)`
    }
    logger(`Request Body: ${bodyStr}`, 'info')
  } catch (error) {
    logger('Could not stringify request body for logging', 'warn')
  }
}

/**
 * Determines if a request should be retried based on the error
 * @param {Error} error The error object
 * @returns {boolean} Whether the request should be retried
 */
const isRetryableError = error => {
  // Network errors are generally retryable
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return true
  }

  // Some HTTP status codes are worth retrying
  const status = error.response?.status
  return (
    status === 408 ||
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504
  )
}

/**
 * Calculates exponential backoff delay for retries
 * @param {number} retryCount Current retry attempt
 * @param {number} baseDelayMs Base delay in milliseconds
 * @returns {number} Delay in milliseconds
 */
const calculateBackoff = (retryCount, baseDelayMs = 300) => {
  return Math.min(
    Math.pow(2, retryCount) * baseDelayMs + Math.random() * 100,
    10000 // Max delay of 10 seconds for normal retries
  )
}

// Request interceptor
axiosInstance.interceptors.request.use(
  config => {
    const method = config.method?.toUpperCase() || 'UNKNOWN'
    const url = config.url || 'Unknown URL'

    logger(`${method} REQUEST to ${url}`, 'info')
    safelyLogRequestBody(config.data)

    // Initialize retry count if not set
    if (config.__retryCount === undefined) {
      config.__retryCount = 0
    }

    // Use proxy for initial attempts
    const maxRetries = parseInt(MAX_RETRIES, 10)
    if (config.__retryCount < maxRetries) {
      const agent = getProxyAgent()
      if (agent) {
        config.httpAgent = agent
        config.httpsAgent = agent
        config.proxy = false

        if (config.__retryCount > 0) {
          logger(
            `Retry ${config.__retryCount}/${maxRetries} with proxy`,
            'info'
          )
        }
      }
    } else {
      // Fall back to direct connection after max retries with proxy
      logger('Using direct connection (no proxy) after failed retries', 'warn')
      // Ensure proxy settings are removed
      delete config.httpAgent
      delete config.httpsAgent
      config.proxy = false
    }

    return config
  },
  error => {
    logger(`Request preparation error: ${error.message}`, 'error')
    return Promise.reject(error)
  }
)

// Response interceptor
axiosInstance.interceptors.response.use(
  response => {
    const url = response.config.url || 'Unknown URL'
    logger(`${url}: ${response.status} ${response.statusText}`, 'info')

    // Log summary of response data for debugging if needed
    if (process.env.NODE_ENV === 'development') {
      try {
        const contentType = response.headers['content-type'] || ''
        if (contentType.includes('application/json') && response.data) {
          const keys = Object.keys(response.data)
          devLogger(`Response contains keys: ${keys.join(', ')}`, 'debug')
        }
      } catch (error) {
        // Ignore errors in debug logging
      }
    }

    return response
  },
  async error => {
    // If no config is available, we cannot retry
    if (!error.config) {
      logger(`Request failed without config: ${error.message}`, 'error')
      return Promise.reject(error)
    }

    const config = error.config
    const url = config.url || 'Unknown URL'

    // Initialize retry count if not set
    config.__retryCount = config.__retryCount || 0
    const maxRetries = parseInt(MAX_RETRIES, 10)

    // Log specific error details
    if (error.response) {
      logger(`${url}: HTTP ${error.response.status} - ${error.message}`, 'warn')

      // Log detailed error information for server errors
      if (error.response.status >= 500) {
        devLogger(`Server error details for ${url}:`, 'error')
        if (error.response.data) {
          devLogger(JSON.stringify(error.response.data, null, 2), 'error')
        }
      }
    } else if (error.request) {
      // Request was made but no response received
      logger(`${url}: No response received - ${error.message}`, 'warn')
    } else {
      // Error in setting up the request
      logger(`${url}: Request setup error - ${error.message}`, 'warn')
    }

    // Handle retries with exponential backoff
    if (config.__retryCount < maxRetries && isRetryableError(error)) {
      config.__retryCount += 1

      const delay = calculateBackoff(config.__retryCount)
      logger(
        `Retrying request to ${url}... Attempt ${config.__retryCount}/${maxRetries} after ${delay}ms`,
        'warn'
      )

      // Wait for the calculated delay before retrying
      await new Promise(resolve => setTimeout(resolve, delay))

      // Last retry should use direct connection if proxy attempts failed
      if (config.__retryCount === maxRetries) {
        delete config.httpAgent
        delete config.httpsAgent
        config.proxy = false
        logger(`Final retry attempt using direct connection for ${url}`, 'warn')
      }

      return axiosInstance(config)
    }

    // Handle specific error types with appropriate messages
    if (error.code === 'ECONNABORTED') {
      logger(`Request to ${url} timed out`, 'error')
    } else if (error.response?.status === 429) {
      logger(`Too many requests to ${url}. Rate limit exceeded.`, 'error')
    } else if (
      error.response?.status === 401 ||
      error.response?.status === 403
    ) {
      logger(`Authentication or permission error accessing ${url}`, 'error')
    } else if (error.response?.status === 404) {
      logger(`Resource not found at ${url}`, 'warn')
    } else {
      logger(
        `Max retries reached or non-retryable error for ${url}: ${error.message}`,
        'error'
      )
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
