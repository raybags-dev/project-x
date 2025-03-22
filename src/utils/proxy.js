import axios from 'axios'
import 'dotenv/config'
import { setTimeout } from 'timers/promises'
import url from 'url'
import { logger } from '../loggers/logger.js'

const { PROXY_ENDPOINT, MAX_CONCURRENCY = 180 } = process.env
class RequestQueue {
  constructor (maxRequestsPerMinute) {
    this.queue = []
    this.processing = false
    this.requestTimestamps = []
    this.maxRequestsPerMinute = maxRequestsPerMinute
  }
  async add (requestFn) {
    return new Promise((resolve, reject) => {
      this.queue.push({
        requestFn,
        resolve,
        reject
      })

      if (!this.processing) {
        this.processQueue()
      }
    })
  }
  async processQueue () {
    if (this.queue.length === 0) {
      this.processing = false
      return
    }

    this.processing = true

    await this.waitIfNeeded()

    const { requestFn, resolve, reject } = this.queue.shift()

    try {
      this.requestTimestamps.push(Date.now())
      const result = await requestFn()
      resolve(result)
    } catch (error) {
      reject(error)
    }

    this.processQueue()
  }
  async waitIfNeeded () {
    const now = Date.now()
    this.requestTimestamps = this.requestTimestamps.filter(
      timestamp => now - timestamp < 60000
    )

    if (this.requestTimestamps.length >= this.maxRequestsPerMinute) {
      const oldestTimestamp = this.requestTimestamps[0]
      const waitTime = 60000 - (now - oldestTimestamp) + 100
      if (waitTime > 0) {
        logger(
          `Rate limit reached. Waiting ${waitTime}ms before next request`,
          'warn'
        )
        await setTimeout(waitTime)
      }
    }
  }
}
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
const requestQueue = new RequestQueue(MAX_CONCURRENCY)

const axios_instance = axios.create({
  proxy: proxyConfig,
  timeout: 30000
})
axios_instance.interceptors.request.use(config => {
  logger(`${config.method?.toUpperCase() || 'GET'} ${config.url}`, 'info')
  if (config.data) {
    logger(`payload: ${JSON.stringify(config.data)}`, 'info')
  }
  return config
})
axios_instance.interceptors.response.use(
  response => response,
  async error => {
    const config = error.config
    logger(`Error with request to ${config?.url}: ${error.message}`, 'error')

    if (config?.data) {
      logger(`Request Body: ${JSON.stringify(config.data)}`, 'error')
    }

    if (error.response?.status === 429) {
      logger('Rate limit exceeded (429). Adding delay before retrying.', 'warn')

      const retryAfter =
        parseInt(error.response.headers['retry-after'], 10) || 5
      await setTimeout(retryAfter * 1000)

      if (config) {
        config.__retryCount = config.__retryCount || 0
        if (config.__retryCount < 3) {
          config.__retryCount += 1
          logger(
            `Retrying rate-limited request... Attempt ${config.__retryCount}`,
            'warn'
          )
          return axios_instance(config)
        }
      }
    }

    if (config && error.code) {
      config.__retryCount = config.__retryCount || 0
      if (config.__retryCount < 2) {
        config.__retryCount += 1

        const backoffTime = Math.pow(2, config.__retryCount) * 1000
        logger(
          `Retrying request... Attempt ${config.__retryCount} after ${backoffTime}ms`,
          'warn'
        )

        await setTimeout(backoffTime)
        return axios_instance(config)
      } else {
        logger('Proxy server down. Switching to local network...', 'warn')
        config.proxy = false
        try {
          return await axios.request(config)
        } catch (retryError) {
          logger(`from <axios_instance>: ${retryError}`, 'error')
          return Promise.reject(retryError)
        }
      }
    }

    return Promise.reject(error)
  }
)
const axiosInstance = {
  request: config => requestQueue.add(() => axios_instance.request(config)),
  get: (url, config) => requestQueue.add(() => axios_instance.get(url, config)),
  post: (url, data, config) =>
    requestQueue.add(() => axios_instance.post(url, data, config)),
  put: (url, data, config) =>
    requestQueue.add(() => axios_instance.put(url, data, config)),
  delete: (url, config) =>
    requestQueue.add(() => axios_instance.delete(url, config)),
  patch: (url, data, config) =>
    requestQueue.add(() => axios_instance.patch(url, data, config)),
  head: (url, config) =>
    requestQueue.add(() => axios_instance.head(url, config)),
  options: (url, config) =>
    requestQueue.add(() => axios_instance.options(url, config))
}
export const testProxyConnection = async () => {
  try {
    const response = await axiosInstance.get('http://ipv4.webshare.io/')
    logger(`Proxy up: (${response.data.trim()})`, 'info')
    return response.data
  } catch (error) {
    logger(`Proxy connection test failed: ${error.message}`, 'error')
    throw error
  }
}
export default axiosInstance
