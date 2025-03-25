import express from 'express'
import { customRateLimiter } from '../../middleware/limiters.js'
import { generateBookingComProfile } from '../profileGeneratorsControllers/bookingComProfileGeneratorController.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-booking-review-profile',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 30 * 60 * 1000, // 30 minutes (30 * 60 * 1000 ms)
    max: 50, // Max 3 profile creation requests per user in 30 minutes
    message:
      'Too many Booking.com profile creation requests. Please wait and try again.'
  }),
  asyncMiddleware(generateBookingComProfile)
)

export default router
