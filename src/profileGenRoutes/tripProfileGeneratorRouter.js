import express from 'express'
import { generateTripProfile } from '../profileGeneratorsControllers/tripProfileGeneratorController.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-trip-review-profile',
  authMiddleware,
  isAdmin,

  asyncMiddleware(generateTripProfile)
)

export default router
