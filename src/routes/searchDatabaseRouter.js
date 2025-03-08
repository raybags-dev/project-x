import express from 'express'
import { authMiddleware } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { SearchUserDocsController } from '../controllers/searchDatabaseController.js'
import { customRateLimiter } from '../../middleware/limiters.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/search-docs',
  authMiddleware,
  customRateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Max 50 searches per user in 15 minutes
    message: 'Too many searches. Please wait before trying again.'
  }),
  asyncMiddleware(SearchUserDocsController)
)

export default router
