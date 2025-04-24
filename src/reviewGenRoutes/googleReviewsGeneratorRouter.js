import express from 'express'
import { generateGoogleReviews } from '../spiders/googleSpider.js'
import { updateReview } from '../utilities/utilities.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

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
