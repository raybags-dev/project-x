import { randomBytes } from 'crypto'
import { v4 as uuidv4 } from 'uuid'

export const generateUUID = () => {
  return uuidv4()
}

export const generateUniqueId = length => {
  if (length % 2 !== 0) {
    throw new Error('Length must be even for a valid hex string')
  }
  const bytes = length / 2
  const buffer = randomBytes(bytes)
  const uniqueId = buffer.toString('hex')
  return uniqueId
}
