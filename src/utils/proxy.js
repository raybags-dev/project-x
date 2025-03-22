import axios from 'axios'
import 'dotenv/config'
import url from 'url'
import { logger } from '../loggers/logger.js'

const { PROXY_ENDPOINT } = process.env
function getProxyConfig () {
  if (!PROXY_ENDPOINT) {
    throw new Error(
      'Proxy endpoint missing! Not found in environment variables.'
    )
  }

  const parsedUrl = new url.URL(PROXY_ENDPOINT)
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
  logger(`${config.url}`, 'info')
  if (config.data) {
    logger(`payload: ${JSON.stringify(config.data)}`, 'info')
  }
  return config
})
axiosInstance.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config

    logger(`${config.url}: ${error.message}`, 'warn')
    if (config.data) {
      logger(`Request Body: ${JSON.stringify(config.data)}`, 'warn')
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
