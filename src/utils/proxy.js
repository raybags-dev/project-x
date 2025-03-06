import { logger } from './logger.js'
import 'dotenv/config'
import url from 'url'
import axios from 'axios'

const proxyEndpoint = process.env.PROXY_ENDPOINT

function getProxyConfig () {
  if (!proxyEndpoint) {
    throw new Error(
      'Proxy endpoint missing! Not found in environment variables.'
    )
  }

  // Parse the proxy URL
  const parsedUrl = new url.URL(proxyEndpoint)
  const proxyConfig = {
    protocol: parsedUrl.protocol.replace(':', ''),
    host: parsedUrl.hostname,
    port: parsedUrl.port || 80,
    auth: {
      username: decodeURIComponent(parsedUrl.username),
      password: decodeURIComponent(parsedUrl.password)
    }
  }
  return proxyConfig
}

const proxyConfig = getProxyConfig()

const axiosInstance = axios.create({
  proxy: proxyConfig
})

axiosInstance.interceptors.response.use(
  response => {
    return response
  },
  async error => {
    const config = error.config

    // handle the retry logic
    if (config && config.proxy && error.code) {
      config.__retryCount = config.__retryCount || 0

      if (config.__retryCount < 2) {
        config.__retryCount += 1
        logger(`Retrying with proxy... Attempt ${config.__retryCount}`, 'warn')

        return axiosInstance(config)
      } else {
        logger('Proxy server down. Switching to local network...', 'warn')

        config.proxy = false

        try {
          return await axios.request(config)
        } catch (retryError) {
          logger(`from <axiosInstance>: ${retryError}`, 'error')
          if (error.code && error.code == 429) {
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
