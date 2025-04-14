import express from 'express'
import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware } from '../../middleware/auth.js'
import { searchReviews } from '../controllers/documentController.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/:id/search',
  authMiddleware,
  asyncMiddleware(searchReviews)
)

export default router
