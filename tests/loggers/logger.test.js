import { logger } from '../../src/loggers/logger.js'

describe('Logger Module', () => {
  let consoleLogSpy

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
  })

  afterEach(() => {
    consoleLogSpy.mockRestore()
  })

  describe('logger function', () => {
    it('should log info messages correctly', () => {
      const message = 'Test info message'
      logger(message, 'info')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\]: Test info message$/
        )
      )
    })

    it('should log error messages correctly', () => {
      const message = 'Test error message'
      logger(message, 'error')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[ERROR\]: Test error message$/
        )
      )
    })

    it('should log warn messages correctly', () => {
      const message = 'Test warning message'
      logger(message, 'warn')
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[WARN\]: Test warning message$/
        )
      )
    })

    it('should default to info level if no level is provided', () => {
      const message = 'Test default message'
      logger(message)
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(
          /^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z\] \[INFO\]: Test default message$/
        )
      )
    })
  })
})
