import 'dotenv/config'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import { logger } from '../loggers/logger.js'

const isProduction = process.env.NODE_ENV === 'production'

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

    const browser = await puppeteer.launch({
      headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-features=IsolateOrigins,site-per-process',
        '--disable-http2',
        '--disable-blink-features=AutomationControlled'
      ],
      executablePath: isProduction ? process.env.CHROME_BIN : undefined
    })

    logger('Browser launched successfully', 'info')
    return browser
  } catch (error) {
    logger(`Browser launch failed: ${error.message}`, 'error')
    return { isBrowserReady: false, error }
  }
}
