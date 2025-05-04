import { PROFILE_MODEL } from '../../src/models/profileModel.js'

describe('profileModel', () => {
  it('should have required fields', () => {
    const schema = PROFILE_MODEL.schema.obj

    expect(schema.uuid).toBeDefined()
    expect(schema.reviewSiteSlug).toBeDefined()
    expect(schema.url).toBeDefined()
  })

  it('should set default values', () => {
    const profile = new PROFILE_MODEL()

    expect(profile.uuid).toBeDefined()
    expect(profile.createdTimestamp).toBeInstanceOf(Date)
    expect(profile.enabled).toBe(true)
  })
})
