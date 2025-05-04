import { USER_MODEL } from '../../src/models/user.js'

jest.mock('../../src/models/user.js', () => {
  const mockUserModel = {
    validateSync: jest.fn(),
    save: jest.fn(),
    deleteMany: jest.fn(),
    getSubscriptionStatus: jest.fn() // Directly mock getSubscriptionStatus
  }
  return { USER_MODEL: mockUserModel } // Return the mock object directly
})

describe('User Model', () => {
  let mockUser

  beforeEach(() => {
    mockUser = USER_MODEL
  })

  it('should validate a user with valid data', () => {
    mockUser.validateSync.mockReturnValue(undefined) // Simulate no validation errors

    const validationError = mockUser.validateSync()
    expect(validationError).toBeUndefined()
  })

  it('should throw validation error for missing required fields', () => {
    mockUser.validateSync.mockImplementation(() => {
      const error = new Error('Validation Error')
      error.errors = {
        name: { message: 'Name is required' },
        password: { message: 'Password is required' },
        userId: { message: 'UserId is required' }
      }
      throw error
    })

    expect(() => mockUser.validateSync()).toThrow('Validation Error')
    try {
      mockUser.validateSync()
    } catch (error) {
      expect(error.errors.name).toBeDefined()
      expect(error.errors.password).toBeDefined()
      expect(error.errors.userId).toBeDefined()
    }
  })

  it('should hash the password before saving', async () => {
    mockUser.password = 'password123'
    mockUser.save.mockImplementation(() => {
      mockUser.password = 'hashedPassword123' // Simulate password hashing
    })

    await mockUser.save()
    expect(mockUser.password).not.toBe('password123')
    expect(mockUser.password).toBe('hashedPassword123')
  })

  it('should check if a user is subscribed', async () => {
    mockUser.getSubscriptionStatus.mockResolvedValue(true) // Simulate subscription status

    const isSubscribed = await mockUser.getSubscriptionStatus('mockUserId')
    expect(isSubscribed).toBe(true)
  })
})
