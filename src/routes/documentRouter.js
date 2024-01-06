import express from 'express'
import {
  FindOneDocController,
  DeleteOneDocumentController,
  AllUserDocsController
} from '../controllers/documentController.js'

import { loginUser } from '../../middleware/auth.js'

import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/get-review-document/:documentId',
  authMiddleware,
  asyncMiddleware(FindOneDocController)
)
router.delete(
  '/raybags/v1/review-crawler/document/delete-one/:documentId',
  authMiddleware,
  asyncMiddleware(DeleteOneDocumentController)
)
router.post(
  '/raybags/v1/review-crawler/get-user-account-review-docs',
  authMiddleware,
  asyncMiddleware(AllUserDocsController)
)
export default router
