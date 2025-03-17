import axios from 'axios'
import 'dotenv/config'
import url from 'url'
import { logger } from '../loggers/logger.js'

const proxyEndpoint = process.env.PROXY_ENDPOINT
function getProxyConfig () {
  if (!proxyEndpoint) {
    throw new Error(
      'Proxy endpoint missing! Not found in environment variables.'
    )
  }

  const parsedUrl = new url.URL(proxyEndpoint)
  return {
    protocol: parsedUrl.protocol.replace(':', ''),
    host: parsedUrl.hostname,
    port: parsedUrl.port || 80,
    auth: {
      username: decodeURIComponent(parsedUrl.username),
      password: decodeURIComponent(parsedUrl.password)
    }
  }
}

const proxyConfig = getProxyConfig()

const axiosInstance = axios.create({
  proxy: proxyConfig
})

axiosInstance.interceptors.request.use(config => {
  logger(`Request URL: ${config.url}`, 'info')
  if (config.data) {
    logger(`payload: ${JSON.stringify(config.data)}`, 'info')
  }
  return config
})

axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config

    logger(`Error with request to ${config.url}: ${error.message}`, 'error')
    if (config.data) {
      logger(`Request Body: ${JSON.stringify(config.data)}`, 'error')
    }

    // Handle retry logic
    if (config && config.proxy && error.code) {
      config.__retryCount = config.__retryCount || 0

      if (config.__retryCount < 2) {
        config.__retryCount += 1
        logger(`Retrying request... Attempt ${config.__retryCount}`, 'warn')
        return axiosInstance(config)
      } else {
        logger('Proxy server down. Switching to local network...', 'warn')
        config.proxy = false

        try {
          return await axios.request(config)
        } catch (retryError) {
          logger(`from <axiosInstance>: ${retryError}`, 'error')
          if (error.code && error.code === 429) {
            logger('Too many requests. Please try again later.', 'warn')
            return null
          }
        }
      }
    }

    return Promise.reject(error)
  }
)
export default axiosInstance
