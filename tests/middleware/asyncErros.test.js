import { asyncMiddleware } from '../../middleware/asyncErros.js'

describe('Async Errors Middleware', () => {
  let req, res, next

  beforeEach(() => {
    req = {}
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }
    next = jest.fn()
  })

  it('should handle async errors and return 500', async () => {
    const handler = jest.fn().mockRejectedValue(new Error('Test Error'))
    const wrappedHandler = asyncMiddleware(handler)

    await wrappedHandler(req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      status: 'async-error - failed',
      message: 'Test Error'
    })
  })

  it('should handle TypeError and return 500 with specific message', async () => {
    const handler = jest
      .fn()
      .mockRejectedValue(new TypeError('Cannot read properties of null'))
    const wrappedHandler = asyncMiddleware(handler)

    await wrappedHandler(req, res, next)

    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      status: 'TypeError - null property access',
      message:
        'Attempted to read a property of a null object. Please check your data and ensure all required fields are present.'
    })
  })

  it('should handle CastError and return 400', async () => {
    const handler = jest.fn().mockRejectedValue({
      name: 'CastError',
      message: 'Invalid document ID format'
    })
    const wrappedHandler = asyncMiddleware(handler)

    await wrappedHandler(req, res, next)

    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'mongo-error',
      message: 'Invalid document ID format'
    })
  })
})
