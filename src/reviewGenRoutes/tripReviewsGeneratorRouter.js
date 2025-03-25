import express from 'express'
import { generateTripReviews } from '../ochestrators/tripOche.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-trip-reviews',
  authMiddleware,
  isAdmin,
  asyncMiddleware(generateTripReviews)
)

export default router
