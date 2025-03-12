import { logger } from '../loggers/logger.js'

const validateEndpointDomain = (frontFacingUrl, req) => {
  try {
    if (!frontFacingUrl || !req || !req.url) {
      logger(
        'Validation Error: Missing frontFacingUrl or request object',
        'warn'
      )
      return false
    }
    const match = req.url.match(/create-(.+?)-review-profile/)
    const siteName = match ? match[1].toLowerCase() : null

    if (!siteName) {
      logger(
        'Validation Error: Could not extract site name from request URL',
        'warn'
      )
      return false
    }

    const urlObj = new URL(frontFacingUrl)
    const extractedDomain = urlObj.hostname.split('.')[1]

    if (extractedDomain !== siteName) {
      logger(
        `Domain Mismatch: Expected '${siteName}', but got '${extractedDomain}' from '${frontFacingUrl}'`,
        'error'
      )
      return false
    }

    logger('Domain validation passed ✅', 'info')
    return true
  } catch (error) {
    logger(`Validation Error: ${error.message}`, 'error')
    return false
  }
}

export { validateEndpointDomain }
