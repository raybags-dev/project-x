import express from 'express'
import { generateGoogleProfile } from '../profileGeneratorsControllers/googleProfileGeneratorController.js'

import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-google-review-profile',
  authMiddleware,
  isAdmin,
  asyncMiddleware(generateGoogleProfile)
)

export default router
