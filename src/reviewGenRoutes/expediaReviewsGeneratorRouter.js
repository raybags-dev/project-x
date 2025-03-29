import express from 'express'
import { generateExpediaReviews } from '../ochestrators/expediaOche.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { withThrottle } from '../utils/throttler.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-expedia-reviews',
  authMiddleware,
  isAdmin,
  withThrottle(
    '/raybags/v1/review-crawler/user/generate-expedia-reviews',
    5 * 60 * 1000
  ),
  asyncMiddleware(generateExpediaReviews)
)

export default router
