import express from 'express'
import { generateAgodaReviews } from '../ochestrators/agodaOche.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-agoda-reviews',
  authMiddleware,
  isAdmin,
  asyncMiddleware(generateAgodaReviews)
)
export default router
