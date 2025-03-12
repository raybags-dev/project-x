import express from 'express'
import { generateAgodaReviews } from '../spiders/agodaProcessor.js'

import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { customRateLimiter } from '../../middleware/limiters.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-agoda-reviews',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // Max 5 review generation requests per user in 15 minutes
    message: 'Too many review generation requests. Please try again later.'
  }),
  asyncMiddleware(generateAgodaReviews)
)
export default router
