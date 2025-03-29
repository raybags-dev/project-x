import express from 'express'
import { generateAgodaReviews } from '../ochestrators/agodaOche.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { withThrottle } from '../utils/throttler.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-agoda-reviews',
  authMiddleware,
  isAdmin,
  withThrottle(
    '/raybags/v1/review-crawler/user/generate-agoda-reviews',
    5 * 60 * 1000
  ),
  asyncMiddleware(generateAgodaReviews)
)
export default router
