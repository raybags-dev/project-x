import express from 'express'
import { generateBookingComReviews } from '../ochestrators/bookingOche.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { customRateLimiter } from '../../middleware/limiters.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-booking-reviews',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 40,
    message: 'Too many review generation requests. Please try again later.'
  }),
  asyncMiddleware(generateBookingComReviews)
)
export default router
