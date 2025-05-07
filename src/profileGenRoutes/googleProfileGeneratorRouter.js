import express from 'express'
import isSubscribed from '../../middleware/generalUtils.js'
import { generateGoogleProfile } from '../profileGeneratorsControllers/googleProfileGeneratorController.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-google-review-profile',
  authMiddleware,
  isAdmin,
  isSubscribed,
  asyncMiddleware(generateGoogleProfile)
)

export default router
