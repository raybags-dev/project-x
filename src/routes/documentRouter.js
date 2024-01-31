import express from 'express'
import {
  FindOneDocController,
  DeleteOneDocumentController,
  AllUserDocsController,
  SearchDocumentsController
} from '../controllers/documentController.js'

import { authMiddleware } from '../../middleware/auth.js'
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
router.post(
  '/raybags/v1/review-crawler/search/:id',
  authMiddleware,
  asyncMiddleware(SearchDocumentsController)
)
export default router
