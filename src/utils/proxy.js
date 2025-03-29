import axios from 'axios'
import 'dotenv/config'
import url from 'url'
import { devLogger } from '../loggers/devLogger.js'
import { logger } from '../loggers/logger.js'

const PROXY_ENDPOINT = process.env.PROXY_ENDPOINT

function getProxyConfig () {
  if (!PROXY_ENDPOINT) {
    throw new Error('Proxy endpoint missing in environment variables.')
  }

  try {
    const parsedUrl = new url.URL(PROXY_ENDPOINT)
    logger(`Parsed Proxy URL: ${PROXY_ENDPOINT}`, 'info')

    return {
      protocol: parsedUrl.protocol.replace(':', ''),
      host: parsedUrl.hostname,
      port: parsedUrl.port || 80,
      auth: {
        username: decodeURIComponent(parsedUrl.username),
        password: decodeURIComponent(parsedUrl.password)
      }
    }
  } catch (err) {
    logger(`Error parsing proxy URL: ${err.message}`, 'error')
    throw err
  }
}

const proxyConfig = getProxyConfig()
logger(`Using Proxy Config: ${JSON.stringify(proxyConfig)}`, 'info')

const axiosInstance = axios.create({
  proxy: proxyConfig
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

    // Handle retry logic
    if (config.proxy && error.code) {
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
          logger(`from <axiosInstance>: ${retryError.message}`, 'error')
          if (retryError.code === 429) {
            logger('Too many requests. Please try again later.', 'warn')
            return null
          }
        }
      }
    }

    logger(`Unhandled error in request: ${error.message}`, 'error')
    return null
  }
)

export const testProxyConnection = async () => {
  try {
    const response = await axiosInstance.get('http://ipv4.webshare.io/')
    logger(`Proxy connection successful. IP: ${response.data.trim()}`, 'info')
    return response.data
  } catch (error) {
    logger(`Proxy connection test failed: ${error.message}`, 'error')
    throw error
  }
}

export default axiosInstance
