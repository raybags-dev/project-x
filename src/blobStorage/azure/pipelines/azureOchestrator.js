import { logger } from '../../../loggers/logger.js'
import { uploadReviewsToAzureBlob } from './azureBlobUtility.js'
import { runSaveToLogicAppPipeline } from './azureCosmosPipeline.js'

export function handleAzureBlobAndPipeline (reviewsList, fileParamsList) {
  uploadReviewsToAzureBlob(reviewsList, fileParamsList)
    .then(azureResponseObj => {
      return runSaveToLogicAppPipeline(azureResponseObj, reviewsList)
    })
    .then(cosmosSaveResult => {
      logger(
        `Pipeline status: ${
          cosmosSaveResult.success ? '✅ Success' : '❌ Failure'
        }`
      )
    })
    .catch(err => {
      logger(`❌ Error in Azure pipeline: ${err.message}`, 'error')
    })
}
