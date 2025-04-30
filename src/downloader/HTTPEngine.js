import axios from 'axios'
import 'dotenv/config'
import { devLogger } from '../loggers/devLogger.js'
import { logger } from '../loggers/logger.js'

const axiosInstance = axios.create({ timeout: 10000 })

// Request interceptor to log request bodies
axiosInstance.interceptors.request.use(
  config => {
    // Log the request URL
    const method = config.method?.toUpperCase() || 'UNKNOWN'
    logger(`${method} REQUEST to ${config.url || 'Unknown URL'}`, 'info')

    // If there's a request body, log it
    if (config.data) {
      // Safely stringify the request body
      let bodyStr
      try {
        bodyStr =
          typeof config.data === 'object'
            ? JSON.stringify(config.data)
            : String(config.data)

        // Limit the length of the logged string to prevent huge logs
        if (bodyStr.length > 1000) {
          bodyStr = bodyStr.substring(0, 1000) + '... (truncated)'
        }

        logger(`Request Body: ${bodyStr}`, 'info')
      } catch (error) {
        logger('Could not stringify request body for logging', 'warn')
      }
    }

    return config
  },
  error => {
    logger(`Request preparation error: ${error.message}`, 'error')
    return Promise.reject(error)
  }
)

// Response interceptor for handling errors and retries
axiosInstance.interceptors.response.use(
  response => {
    // Log successful responses
    logger(
      `${response.config.url}: ${response.status} ${response.statusText}`,
      'info'
    )
    return response
  },
  async error => {
    const config = error.config

    if (!config) {
      devLogger(`Request rejected - <${error.message}>`, 'warn')
      logger(`${error.message}`, 'warn')
      return Promise.reject(error)
    }

    logger(`${config.url || 'Unknown URL'}: ${error.message}`, 'warn')

    config.__retryCount = config.__retryCount || 0

    if (config.__retryCount < 2) {
      config.__retryCount += 1
      logger(`Retrying request... Attempt ${config.__retryCount}`, 'warn')
      return axiosInstance(config)
    }

    if (error.code === 'ECONNABORTED') {
      logger('Request timed out.', 'warn')
      return Promise.reject(error)
    }

    if (error.response?.status === 429) {
      logger('Too many requests. Please try again later.', 'warn')
      return Promise.reject(error)
    }

    if (error.response?.status === 404) {
      logger('Resource could not be found or moved', 'warn')
      return Promise.reject(error)
    }

    logger(`Unhandled error in request: ${error.message}`, 'error')

    // For unhandled errors, log more details if available
    if (error.response) {
      logger(`Response status: ${error.response.status}`, 'error')
      if (error.response.data) {
        try {
          const responseData =
            typeof error.response.data === 'object'
              ? JSON.stringify(error.response.data)
              : String(error.response.data)
          logger(`Response data: ${responseData}`, 'error')
        } catch (e) {
          logger('Could not stringify error response data', 'warn')
        }
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
