import { wakeupService } from '../../middleware/ping_service.js'

jest.mock('../../src/downloader/HTTPEngine.js', () => ({
  get: jest.fn().mockResolvedValue({ status: 200 })
}))

describe('Ping Service Middleware', () => {
  let req, res, next

  beforeEach(() => {
    req = {}
    res = {}
    next = jest.fn()
  })

  it('should call next after waking up service', async () => {
    await wakeupService(req, res, next)

    expect(next).toHaveBeenCalled()
  })
})
