import express from 'express'
import { generateOpentableReviews } from '../ochestrators/opentableOche.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { withThrottle } from '../utils/throttler.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-opentable-reviews',
  authMiddleware,
  isAdmin,
  withThrottle(
    '/raybags/v1/review-crawler/user/generate-opentable-reviews',
    5 * 60 * 1000
  ),
  asyncMiddleware(generateOpentableReviews)
)

export default router
