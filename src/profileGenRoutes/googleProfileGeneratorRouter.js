import express from 'express'
import { generateGoogleProfile } from '../profileGeneratorsControllers/googleProfileGeneratorController.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { customRateLimiter } from '../../middleware/limiters.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-google-review-profile',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 30 * 60 * 1000, // 30 minutes (30 * 60 * 1000 ms)
    max: 50, // Max 3 profile creation requests per user in 30 minutes
    message:
      'Too many google.com profile creation requests. Please wait and try again.'
  }),
  asyncMiddleware(generateGoogleProfile)
)

export default router
