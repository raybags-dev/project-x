import express from 'express'
import { generateOpentableReviews } from '../ochestrators/opentableOche.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/generate-opentable-reviews',
  authMiddleware,
  isAdmin,
  asyncMiddleware(generateOpentableReviews)
)

export default router
