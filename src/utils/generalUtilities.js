import { logger } from '../loggers/logger.js'

export const sanitizeDBObject = (object, fieldsToRemove) => {
  const objectCopy = object.toObject ? object.toObject() : { ...object }
  fieldsToRemove.forEach(key => delete objectCopy[key])
  return objectCopy
}
export function validateResponse (response) {
  if (!response || !response.data) {
    logger('No response data received', 'warn')
    return false
  }
  return true
}
