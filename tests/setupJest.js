import path from 'path'

// Set up global variables for testing
global.__dirname = path.resolve()
global.__filename = path.join(global.__dirname, 'tests/setupJest.js')

global.fetch = jest.fn()
global.Headers = jest.fn(() => ({
  get: jest.fn()
}))
global.Blob = jest.fn()
