// __tests__/uploadReviewsToBlob.test.js
import * as identity from '@azure/identity'
import { SecretClient } from '@azure/keyvault-secrets'
import { BlobServiceClient } from '@azure/storage-blob'
import { uploadReviewsToAzureBlob } from '../../src/blobStorage/azure/pipelines/azureBlobUtility.js'

jest.mock('@azure/storage-blob')
jest.mock('@azure/keyvault-secrets')
jest.mock('@azure/identity')
jest.mock('../../src/loggers/logger.js', () => ({
  logger: jest.fn()
}))

describe('uploadReviewsToAzureBlob', () => {
  const mockUpload = jest.fn()
  const mockExists = jest.fn()
  const mockCreate = jest.fn()
  const mockGetContainerClient = jest.fn()
  const mockGetBlockBlobClient = jest.fn()

  const mockReviews = [{ id: 1, content: 'Great!' }]
  const validParams = ['hotelA', '2025', 'batch-1']

  beforeEach(() => {
    jest.clearAllMocks()

    // Mocks for BlobServiceClient
    BlobServiceClient.fromConnectionString.mockReturnValue({
      getContainerClient: mockGetContainerClient
    })

    mockGetContainerClient.mockReturnValue({
      exists: mockExists,
      create: mockCreate,
      getBlockBlobClient: mockGetBlockBlobClient
    })

    mockExists.mockResolvedValue(false)
    mockCreate.mockResolvedValue()
    mockUpload.mockResolvedValue()
    mockGetBlockBlobClient.mockReturnValue({
      upload: mockUpload,
      url: 'https://fake.blob.core.windows.net/container/blob.json'
    })
  })

  it('returns early if reviews list is empty', async () => {
    const result = await uploadReviewsToAzureBlob([], validParams)
    expect(result).toBeUndefined()
  })

  it('returns error for invalid file_params_list', async () => {
    const result = await uploadReviewsToAzureBlob(mockReviews, ['onlyOne'])
    expect(result.success).toBe(false)
    expect(result.error).toMatch(/exactly 3/)
  })

  it('uploads to blob in development mode with direct connection string', async () => {
    process.env.NODE_ENV = 'development'
    process.env.AZURE_STORAGE_CONNECTION_STRING = 'UseDevelopmentStorage=true'

    const result = await uploadReviewsToAzureBlob(mockReviews, validParams)

    expect(mockUpload).toHaveBeenCalled()
    expect(result.blobUrl).toContain('https://fake.blob.core.windows.net')
  }, 30000)

  it('fetches secret from key vault in production mode', async () => {
    process.env.NODE_ENV = 'production'
    process.env.AZURE_TENANT_ID = 'tenant'
    process.env.AZURE_CLIENT_ID = 'client'
    process.env.AZURE_CLIENT_SECRET = 'secret'
    process.env.AZURE_KEYVAULT = 'fakevault'
    process.env.AZURE_BLOB_SAS_SECRET = 'storageSecretName'

    const mockCredential = {}
    identity.ClientSecretCredential.mockReturnValue(mockCredential)

    const mockSecret = { value: 'UseProductionStorage=true' }
    SecretClient.mockImplementation(() => ({
      getSecret: jest.fn().mockResolvedValue(mockSecret)
    }))

    const result = await uploadReviewsToAzureBlob(mockReviews, validParams)
    expect(result.success).toBe(true)
    expect(result.blobName).toMatch(/reviews_/)
  }, 30000)
})
