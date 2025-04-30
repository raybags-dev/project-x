import { logger } from '../../../loggers/logger.js'
import { uploadReviewsToAzureBlob } from './azureBlobUtility.js'
import { runSaveToLogicAppPipeline } from './azureCosmosPipeline.js'

export function handleAzureBlobAndPipeline (
  reviewsList,
  fileParamsList,
  run_pipeline = true
) {
  if (!run_pipeline) return logger(`bucket storage (azure) is turned off!`)
  uploadReviewsToAzureBlob(reviewsList, fileParamsList)
    .then(azureResponseObj => {
      return runSaveToLogicAppPipeline(azureResponseObj, reviewsList)
    })
    .then(cosmosSaveResult => {
      logger(
        `Pipeline status: ${
          cosmosSaveResult.success ? '✅ Success' : 'Did not run'
        }`
      )
    })
    .catch(err => {
      logger(`Error in Azure pipeline: ${err.message}`, 'warn')
    })
}
