import express from 'express'
import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware } from '../../middleware/auth.js'
import { searchReviews } from '../controllers/documentController.js'
import { withThrottle } from '../utils/throttler.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/:id/search',
  authMiddleware,
  withThrottle('/raybags/v1/review-crawler/user/:id/search', 5 * 60 * 1000),
  asyncMiddleware(searchReviews)
)

export default router
