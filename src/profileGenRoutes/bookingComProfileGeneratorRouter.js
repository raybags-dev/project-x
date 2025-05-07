import express from 'express'
import isSubscribed from '../../middleware/generalUtils.js'
import { generateBookingComProfile } from '../profileGeneratorsControllers/bookingComProfileGeneratorController.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-booking-review-profile',
  authMiddleware,
  isAdmin,
  isSubscribed,
  asyncMiddleware(generateBookingComProfile)
)

export default router
