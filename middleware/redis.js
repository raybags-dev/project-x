import redis from 'redis'
import { logger } from '../src/utils/logger.js'

/*
 * =====================
 * =====================
 * Implimenting REDIS for caching....
 * =====================
 * =====================
 */
async function createRedisClient () {
  try {
    const REDIS_PORT = process.env.REDIS_PORT || 6379
    const REDIS_HOST = process.env.REDIS_HOST || 'localhost'
    const redisClient = redis.createClient(REDIS_PORT, REDIS_HOST)

    redisClient.on('connect', () => {
      console.log('redis connected!')
    })
    redisClient.on('error', e => {
      console.log('Error: ' + e.message)
    })

    return redisClient
  } catch (e) {
    console.log('\nError: Connection failed: ' + e.message)
  } finally {
    console.log('connection to redis failed!!!.')
  }
}
export async function cacheResponse (key, expirySeconds, value) {
  return new Promise((resolve, reject) => {
    const redis_client = createRedisClient()

    redis_client.on('connect', async () => {
      try {
        await redis_client.setex(key, expirySeconds, JSON.stringify(value))
        resolve(value)
      } catch (error) {
        console.log(error)

        reject(error)
      } finally {
        redis_client.quit()
      }
    })

    redis_client.on('error', error => {
      console.log(error)
      reject(error)
    })
  })
}
// get cahced response
export async function getCachedData (key) {
  return new Promise((resolve, reject) => {
    const redis_client = createRedisClient()

    redis_client.on('connect', async () => {
      try {
        const value = await redis_client.get(key)
        resolve(JSON.parse(value))
      } catch (error) {
        reject(error)
      } finally {
        redis_client.quit()
      }
    })

    redis_client.on('error', error => {
      reject(error)
    })
  })
}

/*
 * =====================
 * =====================
 * Implimenting REDIS for caching....
 * =====================
 * =====================
 */
