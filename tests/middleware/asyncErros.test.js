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
