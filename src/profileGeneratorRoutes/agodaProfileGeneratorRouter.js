import express from 'express'
import { generateAgodaProfile } from '../profileGeneratorsControllers/agodaProfileGeneratorController.js'
import { customRateLimiter } from '../../middleware/limiters.js'

import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-agoda-review-profile',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 30 * 60 * 1000, // 30 minutes
    max: 10,
    message:
      'Too many profile creation requests. Please wait before trying again.'
  }),
  asyncMiddleware(generateAgodaProfile)
)

export default router
