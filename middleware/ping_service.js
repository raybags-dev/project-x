import 'dotenv/config'
import cron from 'node-cron'
import axiosInstance from '../src/utils/proxy.js'

const isProd = process.env.NODE_ENV === 'production' && process.env.PROD_URL
const productionUrl = process.env.PROD_URL

async function wakeupService (req, res, next) {
  if (!isProd) return next()

  try {
    await axiosInstance.get(productionUrl)
    next()
  } catch (error) {
    console.error('Error prod-dyno:', error.message)
    next()
  }
}

function dynoActivator () {
  if (!isProd) return

  const cron_schedule = '*/10 * * * *'
  cron.schedule(cron_schedule, async () => {
    console.log('pinging prod-dyno...')

    try {
      const response = await axiosInstance.get(productionUrl)
      console.log(`> is_dyno_awake: ${response.status === 200}`)
    } catch (error) {
      console.error('Error pinging prod-dyno:', error.message)
    }
  })
}

export { dynoActivator, wakeupService }
