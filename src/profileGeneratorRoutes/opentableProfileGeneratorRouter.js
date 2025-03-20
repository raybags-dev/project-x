import express from 'express'
import { generateOpentableProfile } from '../profileGeneratorsControllers/opentableProfileGeneratorController.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { customRateLimiter } from '../../middleware/limiters.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-opentable-review-profile',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 30 * 60 * 1000,
    max: 50,
    message:
      'Too many opentable profile creation requests. Please wait and try again.'
  }),
  asyncMiddleware(generateOpentableProfile)
)

export default router
