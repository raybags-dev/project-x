import favicon from 'serve-favicon'
import path from 'path'
import { fileURLToPath } from 'url'
import { dirname } from 'path'
import axiosInstance from './proxy.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

async function testUrl (url) {
  try {
    const response = await axiosInstance.head(url)
    return response.status >= 200 && response.status < 400
  } catch (error) {
    return false
  }
}
export async function findAccessibleUrl (...urls) {
  const accessibilityResults = await Promise.all(urls.map(testUrl))

  for (let i = 0; i < urls.length; i++) {
    if (accessibilityResults[i]) {
      return urls[i]
    }
  }
  return null
}
export async function handleNotSupported (app) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../../notSupported', 'index.html'))
  })
}
export async function miscellaneous (app) {
  const faviconPath = path.join(
    dirname(fileURLToPath(import.meta.url)),
    '../../public/images/favicon.ico'
  )
  app.use(favicon(faviconPath))
}
