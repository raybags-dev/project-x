import express from 'express'
import { generateTripProfile } from '../profileGeneratorsControllers/tripProfileGeneratorController.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { customRateLimiter } from '../../middleware/limiters.js'
import { withThrottle } from '../utils/throttler.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-trip-review-profile',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 30 * 60 * 1000, // 30 minutes (30 * 60 * 1000 ms)
    max: 5, // Max 5 profile creation requests per user in 30 minutes
    message:
      'Too many trip.com profile creation requests. Please wait and try again.'
  }),
  withThrottle(
    '/raybags/v1/review-crawler/user/create-trip-review-profile',
    5 * 60 * 1000
  ),
  asyncMiddleware(generateTripProfile)
)

export default router
