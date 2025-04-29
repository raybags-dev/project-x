import 'dotenv/config'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { logger } from '../loggers/logger.js'

const isProduction = process.env.NODE_ENV === 'production'
const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium'

let stealthApplied = false

export async function launchBrowser (headless = true) {
  try {
    if (!stealthApplied) {
      puppeteer.use(
        StealthPlugin({
          showConsole: true,
          blockAds: false,
          skipFrameBusting: true
        })
      )
      stealthApplied = true
    }

    const executablePath = isProduction
      ? execPath
      : '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

    const browser = await puppeteer.launch({
      headless,
      executablePath,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-http2',
        '--disable-blink-features=AutomationControlled'
      ]
    })

    logger('Browser launched successfully', 'info')
    return browser
  } catch (error) {
    logger(`Browser launch failed: ${error.message}`, 'error')
    return { isBrowserReady: false, error }
  }
}
