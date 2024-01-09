import express from 'express'
import { generateAgodaReviews } from '../processors/agodaProcessor.js'

import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-agoda-reviews',
  authMiddleware,
  isAdmin,
  asyncMiddleware(generateAgodaReviews)
)

export default router
