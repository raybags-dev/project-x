import express from 'express'
import { generateBookingComProfile } from '../profileGeneratorsControllers/bookingComProfileGeneratorController.js'

import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-booking-review-profile',
  authMiddleware,
  isAdmin,
  asyncMiddleware(generateBookingComProfile)
)

export default router
