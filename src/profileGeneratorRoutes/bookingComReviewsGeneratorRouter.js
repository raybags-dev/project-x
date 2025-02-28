import express from 'express'
import { generateBookingComReviews } from '../processors/bookingComProcessor.js'

import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-booking-reviews',
  authMiddleware,
  isAdmin,
  asyncMiddleware(generateBookingComReviews)
)

export default router
