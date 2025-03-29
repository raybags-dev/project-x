import express from 'express'
import { generateBookingComReviews } from '../ochestrators/bookingOche.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { withThrottle } from '../utils/throttler.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-booking-reviews',
  authMiddleware,
  isAdmin,
  withThrottle(
    '/raybags/v1/review-crawler/user/generate-booking-reviews',
    5 * 60 * 1000
  ),
  asyncMiddleware(generateBookingComReviews)
)
export default router
