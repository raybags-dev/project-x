import express from 'express'
import { authMiddleware } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { SearchUserDocsController } from '../controllers/searchDatabaseController.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/search-docs',
  authMiddleware,
  asyncMiddleware(SearchUserDocsController)
)
export default router
