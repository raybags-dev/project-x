// /azure/uploadReviewsToBlob.js
import { ClientSecretCredential } from '@azure/identity'
import { SecretClient } from '@azure/keyvault-secrets'
import { BlobServiceClient } from '@azure/storage-blob'
import 'dotenv/config'
import { logger } from '../../../loggers/logger.js'

const {
  AZURE_STORAGE_CONNECTION_STRING,
  AZURE_TENANT_ID,
  AZURE_CLIENT_ID,
  AZURE_CLIENT_SECRET,
  NODE_ENV,
  AZURE_KEYVAULT,
  AZURE_STORAGE_CONTAINER,
  AZURE_BLOB_SAS_SECRET
} = process.env

const CONTAINER = AZURE_STORAGE_CONTAINER || 'reviews-container'

const getStorageConnectionString = async () => {
  if (NODE_ENV !== 'production') {
    return AZURE_STORAGE_CONNECTION_STRING
  }

  const credential = new ClientSecretCredential(
    AZURE_TENANT_ID,
    AZURE_CLIENT_ID,
    AZURE_CLIENT_SECRET
  )

  const vaultName = AZURE_KEYVAULT
  const secretName = AZURE_BLOB_SAS_SECRET
  const url = `https://${vaultName}.vault.azure.net`

  const secretClient = new SecretClient(url, credential)
  const secret = await secretClient.getSecret(secretName)
  return secret.value
}
const ensureContainerExists = async blobServiceClient => {
  const containerClient = blobServiceClient.getContainerClient(CONTAINER)
  const exists = await containerClient.exists()

  if (!exists) {
    await containerClient.create({ access: 'blob' })
    logger(`✅ Created container: ${CONTAINER}`, 'info')
  }

  return containerClient
}
export async function uploadReviewsToAzureBlob (reviewsList, file_params_list) {
  if (!Array.isArray(reviewsList) || reviewsList.length === 0) return

  // Validate and normalize file naming parameters
  if (!Array.isArray(file_params_list) || file_params_list.length !== 3) {
    logger('file_params_list must be an array with exactly 3 entries', 'warn')
    return {
      success: false,
      error: 'file_params_list must be an array with exactly 3 elements.'
    }
  }

  const normalizedParams = file_params_list.map((param, index) => {
    if (param == null) {
      logger(`Parameter at position ${index} is null or undefined.`, 'warn')
      return null
    }

    // sanitize blob filename params
    if (typeof param === 'object') {
      if (
        param.toString &&
        param.constructor &&
        param.constructor.name === 'ObjectId'
      ) {
        return param.toString()
      }
      return JSON.stringify(param)
    }
    return String(param)
  })

  if (normalizedParams.some(param => param === null)) {
    return {
      success: false,
      error: 'One or more parameters in file_params_list are null or undefined.'
    }
  }

  const emptyParamIndex = normalizedParams.findIndex(
    param => param.trim() === ''
  )
  if (emptyParamIndex !== -1) {
    logger(
      `Parameter at position ${emptyParamIndex} is an empty string.`,
      'warn'
    )
    return {
      success: false,
      error: `Parameter at position ${emptyParamIndex} is an empty string`
    }
  }

  const maxRetries = 3
  const retryDelay = 2000
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

  const sanitize = str =>
    str
      .toString()
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_+|_+$/g, '')

  const sanitizedParts = normalizedParams.map(sanitize)
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
  const blobBaseName = `${sanitizedParts.join('_')}_reviews_${timestamp}.json`
  const data = JSON.stringify(reviewsList, null, 2)
  const contentLength = Buffer.byteLength(data)

  logger(
    `🔄 Preparing to upload ${reviewsList.length} reviews to blob: ${blobBaseName}`,
    'info'
  )

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Get connection and set up clients
      const connectionString = await getStorageConnectionString()
      if (!connectionString) {
        throw new Error('Failed to retrieve valid storage connection string')
      }

      const blobServiceClient =
        BlobServiceClient.fromConnectionString(connectionString)
      const containerClient = await ensureContainerExists(blobServiceClient)
      const blockBlobClient = containerClient.getBlockBlobClient(blobBaseName)

      // Upload the data
      await blockBlobClient.upload(data, contentLength, {
        blobHTTPHeaders: { blobContentType: 'application/json' },
        metadata: {
          sourceSystem: 'reviewer-x',
          recordCount: reviewsList.length.toString(),
          created: new Date().toISOString()
        }
      })

      logger(
        `✅ Uploaded ${reviewsList.length} reviews to blob: ${blobBaseName}`,
        'info'
      )
      logger(`Blob URL: ${blockBlobClient.url}`, 'info')

      return {
        success: true,
        blobUrl: blockBlobClient.url,
        blobName: blobBaseName,
        recordCount: reviewsList.length
      }
    } catch (err) {
      const errorMessage = err.message || 'Unknown error'
      const errorCode = err.code || 'NO_CODE'

      if (
        errorMessage.includes('getaddrinfo') ||
        errorMessage.includes('ENOTFOUND')
      ) {
        logger(
          `Network connectivity issue detected: ${errorMessage}. Check DNS and network connectivity.`,
          'error'
        )
      }

      // Implement exponential backoff for more efficient retries
      const backoffDelay = retryDelay * Math.pow(2, attempt - 1)
      logger(
        `Attempt ${attempt} failed (${errorCode}): ${errorMessage}`,
        'warn'
      )

      if (attempt < maxRetries) {
        logger(`🔁 Retrying in ${backoffDelay / 1000} seconds...`, 'info')
        await sleep(backoffDelay)
      } else {
        logger('All attempts to upload to Azure Blob failed.', 'error')
        return {
          success: false,
          error: errorMessage,
          errorCode: errorCode,
          attemptsMade: maxRetries
        }
      }
    }
  }
}
