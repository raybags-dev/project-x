import express from 'express'
import isSubscribed from '../../middleware/generalUtils.js'
import { generateAgodaProfile } from '../profileGeneratorsControllers/agodaProfileGeneratorController.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-agoda-review-profile',
  authMiddleware,
  isAdmin,
  isSubscribed,
  asyncMiddleware(generateAgodaProfile)
)

export default router
