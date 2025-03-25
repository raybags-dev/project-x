import express from 'express'
import { generateExpediaReviews } from '../ochestrators/expediaOche.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-expedia-reviews',
  authMiddleware,
  isAdmin,
  asyncMiddleware(generateExpediaReviews)
)

export default router
