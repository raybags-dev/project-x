import {
  authMiddleware,
  isAdmin,
  validateSuperUserToken
} from '../../middleware/auth.js'

describe('Auth Middleware', () => {
  let req, res, next

  beforeEach(() => {
    req = { headers: {}, user: { isAdmin: false } }
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    next = jest.fn()
  })

  it('should return 401 if authorization header is missing', () => {
    authMiddleware(req, res, next)

    expect(res.status).toHaveBeenCalledWith(401)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Authentication Failed: Missing required header(s)'
    })
  })

  it('should call next if user is admin', () => {
    req.user.isAdmin = true

    isAdmin(req, res, next)

    expect(next).toHaveBeenCalled()
  })

  it('should return 403 if user is not admin', () => {
    isAdmin(req, res, next)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      message: 'FORBIDDEN: Access denied!'
    })
  })

  it('should validate super user token correctly', () => {
    const result = validateSuperUserToken('validToken', 'validToken')
    expect(result).toBe(true)
  })

  it('should return false for invalid super user token', () => {
    const result = validateSuperUserToken('validToken', 'invalidToken')
    expect(result).toBe(false)
  })
})
