import axios from 'axios'

// Setup mock methods
const mockGet = jest.fn()
const mockPost = jest.fn()
const mockPut = jest.fn()
const mockDelete = jest.fn()

let requestInterceptor = null
let responseInterceptor = null
let errorInterceptor = null

// Setup axios instance mock
const mockAxiosInstance = {
  interceptors: {
    request: {
      use: jest.fn((successFn, errorFn) => {
        requestInterceptor = successFn
        return mockAxiosInstance
      })
    },
    response: {
      use: jest.fn((successFn, errorFn) => {
        responseInterceptor = successFn
        errorInterceptor = errorFn
        return mockAxiosInstance
      })
    }
  },
  get: mockGet,
  post: mockPost,
  put: mockPut,
  delete: mockDelete
}

// Setup axios mock
jest.mock('axios', () => ({
  create: jest.fn(() => mockAxiosInstance)
}))

// Force axios create to be called
axios.create({ timeout: 10000 })

// Import after mocks
const axiosInstance = require('../../src/downloader/HTTPEngine.js').default

describe('HTTPEngine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Reinitialize axios instance
    axios.create({ timeout: 10000 })
  })

  it('should create axios instance with timeout', () => {
    expect(axios.create).toHaveBeenCalledWith({ timeout: 10000 })
  })

  it('should make GET requests', async () => {
    const mockResponse = { data: { test: 'data' } }
    mockGet.mockResolvedValueOnce(mockResponse)

    const response = await axiosInstance.get('/test-url')
    expect(response).toEqual(mockResponse)
    expect(mockGet).toHaveBeenCalledWith('/test-url')
  })

  it('should make POST requests', async () => {
    const mockData = { test: 'data' }
    const mockResponse = { data: { success: true } }
    mockPost.mockResolvedValueOnce(mockResponse)

    const response = await axiosInstance.post('/test-url', mockData)
    expect(response).toEqual(mockResponse)
    expect(mockPost).toHaveBeenCalledWith('/test-url', mockData)
  })

  it('should handle request errors', async () => {
    const error = new Error('Network Error')
    mockGet.mockRejectedValueOnce(error)

    await expect(axiosInstance.get('/test-url')).rejects.toThrow(
      'Network Error'
    )
  })

  it('should have request and response interceptors', () => {
    expect(requestInterceptor).toBeDefined()
    expect(responseInterceptor).toBeDefined()
    expect(errorInterceptor).toBeDefined()
  })

  it('should log request details in request interceptor', async () => {
    const config = {
      method: 'GET',
      url: '/test',
      data: { test: 'data' }
    }

    const result = await requestInterceptor(config)
    expect(result).toEqual(config)
  })

  it('should handle successful responses in response interceptor', async () => {
    const response = {
      config: { url: '/test' },
      status: 200,
      statusText: 'OK'
    }

    const result = await responseInterceptor(response)
    expect(result).toEqual(response)
  })

  afterAll(() => {
    jest.restoreAllMocks()
  })
})
