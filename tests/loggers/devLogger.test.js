import { devLogger } from '../../src/loggers/devLogger.js'

describe('DevLogger Module', () => {
  let consoleLogSpy
  let consoleErrorSpy
  let consoleWarnSpy

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleWarnSpy.mockRestore()
  })

  describe('devLogger function', () => {
    it('should log development messages correctly', () => {
      const message = 'Test dev message'
      devLogger(message, 'info')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /> \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\): Test dev message/
        )
      )
    })

    it('should handle error level messages', () => {
      const message = 'Test dev error'
      devLogger(message, 'error')
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /> \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\): Test dev error/
        )
      )
    })

    it('should handle warning level messages', () => {
      const message = 'Test dev warning'
      devLogger(message, 'warn')
      expect(consoleWarnSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /> \(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\): Test dev warning/
        )
      )
    })
  })
})
