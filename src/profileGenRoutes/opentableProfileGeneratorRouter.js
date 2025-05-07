import express from 'express'
import isSubscribed from '../../middleware/generalUtils.js'
import { generateOpentableProfile } from '../profileGeneratorsControllers/opentableProfileGeneratorController.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-opentable-review-profile',
  authMiddleware,
  isAdmin,
  isSubscribed,
  asyncMiddleware(generateOpentableProfile)
)

export default router
