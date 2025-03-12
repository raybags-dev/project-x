import express from 'express'
import { generateGoogleReviews } from '../spiders/googleProcessor.js'
import { updateReview } from '../utils/utilities.js'

import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { customRateLimiter } from '../../middleware/limiters.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-google-reviews',
  authMiddleware,
  isAdmin,
  asyncMiddleware(generateGoogleReviews)
)
router.post(
  '/raybags/v1/review-crawler/update-review',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: 'Too many review generation requests. Please try again later.'
  }),
  asyncMiddleware(updateReview)
)

export default router
