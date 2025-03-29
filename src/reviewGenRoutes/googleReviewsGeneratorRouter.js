import express from 'express'
import { generateGoogleReviews } from '../spiders/googleSpider.js'
import { updateReview } from '../utils/utilities.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { withThrottle } from '../utils/throttler.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-google-reviews',
  authMiddleware,
  isAdmin,
  withThrottle(
    '/raybags/v1/review-crawler/user/generate-google-reviews',
    5 * 60 * 1000
  ),
  asyncMiddleware(generateGoogleReviews)
)
router.post(
  '/raybags/v1/review-crawler/update-review',
  authMiddleware,
  isAdmin,
  withThrottle('/raybags/v1/review-crawler/update-review', 5 * 60 * 1000),
  asyncMiddleware(updateReview)
)

export default router
