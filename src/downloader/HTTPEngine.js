import axios from 'axios'
import 'dotenv/config'
import { devLogger } from '../loggers/devLogger.js'
import { logger } from '../loggers/logger.js'

const axiosInstance = axios.create({
  timeout: 10000,
  headers: {
    'User-Agent': 'axios-client'
  }
})
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config

    if (!config) {
      devLogger(`Request rejected - <${error.message}>`, 'warn')
      logger(`${error.message}`, 'warn')
      return null
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
      return null
    }

    if (error.response?.status === 429) {
      logger('Too many requests. Please try again later.', 'warn')
      return null
    }
    if (error.response?.status === 404) {
      logger('Resource could not be found or moved', 'warn')
      return null
    }

    logger(`Unhandled error in request: ${error.message}`, 'error')
    return null
  }
)

export default axiosInstance
