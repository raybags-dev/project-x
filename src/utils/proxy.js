import dotenv from 'dotenv'
import url from 'url'
import axios from 'axios'
import { logger } from './logger.js'

// Load .env configuration
dotenv.config()

function getProxyConfig () {
  const proxyEndpoint = process.env.PROXY_ENDPOINT

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
    port: parsedUrl.port,
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

      if (config.__retryCount < 3) {
        config.__retryCount += 1
        logger(
          `Retrying request with proxy... Attempt ${config.__retryCount}`,
          'warn'
        )

        // Retry the request with the proxy
        return axiosInstance(config)
      } else {
        logger(
          'Proxy request failed 3 times. Switching to normal network.',
          'error'
        )

        // After 3 failed attempts, remove the proxy and retry without it
        config.proxy = false

        try {
          return await axios.request(config)
        } catch (retryError) {
          logger(
            `Request failed even without proxy: ${retryError.message}`,
            'error'
          )
          throw retryError
        }
      }
    }

    return Promise.reject(error)
  }
)

export default axiosInstance
