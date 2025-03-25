import express from 'express'
import { customRateLimiter } from '../../middleware/limiters.js'
import { generateAgodaProfile } from '../profileGeneratorsControllers/agodaProfileGeneratorController.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-agoda-review-profile',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 30 * 60 * 1000, // 30 minutes (30 * 60 * 1000 ms)
    max: 50, // Max 3 profile creation requests per user in 30 minutes
    message:
      'Too many agoda profile creation requests. Please wait before trying again.'
  }),
  asyncMiddleware(generateAgodaProfile)
)

export default router
