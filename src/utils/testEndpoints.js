import axios from 'axios'

async function testUrl (url) {
  try {
    const response = await axios.head(url)
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
