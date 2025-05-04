import {
  generateUUID,
  generateUniqueId
} from '../../middleware/uuidGenerator.js'

describe('UUID Generator Middleware', () => {
  it('should generate a valid UUID', () => {
    const uuid = generateUUID()
    expect(uuid).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
    )
  })

  it('should generate a unique ID of specified length', () => {
    const uniqueId = generateUniqueId(16)
    expect(uniqueId).toHaveLength(16)
  })

  it('should throw an error if length is not even', () => {
    expect(() => generateUniqueId(15)).toThrow(
      'Length must be even for a valid hex string'
    )
  })
})
