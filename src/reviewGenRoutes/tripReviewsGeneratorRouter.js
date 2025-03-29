import express from 'express'
import { generateTripReviews } from '../ochestrators/tripOche.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { withThrottle } from '../utils/throttler.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-trip-reviews',
  authMiddleware,
  isAdmin,
  withThrottle(
    '/raybags/v1/review-crawler/user/generate-trip-reviews',
    5 * 60 * 1000
  ),
  asyncMiddleware(generateTripReviews)
)

export default router
