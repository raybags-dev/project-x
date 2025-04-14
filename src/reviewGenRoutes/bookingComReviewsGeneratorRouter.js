import express from 'express'
import { generateBookingComReviews } from '../ochestrators/bookingOche.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-booking-reviews',
  authMiddleware,
  isAdmin,
  asyncMiddleware(generateBookingComReviews)
)
export default router
