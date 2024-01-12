import express from 'express'
import {
  generateGoogleReviews,
  updateReview
} from '../processors/googleProcessor.js'

import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'

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
  asyncMiddleware(updateReview)
)

export default router
