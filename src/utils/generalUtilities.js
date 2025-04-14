import { logger } from '../loggers/logger.js'

export const sanitizeDBObject = (object, fieldsToRemove) => {
  const objectCopy = object.toObject ? object.toObject() : { ...object }
  fieldsToRemove.forEach(key => delete objectCopy[key])
  return objectCopy
}
export function validateResponse (response) {
  if (!response) {
    logger('No response received', 'warn')
    return false
  }

  if (response.status < 200 || response.status >= 300) {
    logger(`HTTP error: ${response.status} - ${response.statusText}`, 'warn')
    return false
  }
  if (
    !response.data ||
    (typeof response.data === 'object' &&
      Object.keys(response.data).length === 0)
  ) {
    logger('Response data is empty', 'warn')
    return false
  }

  return true
}
