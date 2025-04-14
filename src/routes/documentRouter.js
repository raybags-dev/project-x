import express from 'express'
import {
  AllUserDocsController,
  DeleteAllUserProfileDocumentsController,
  DeleteOneDocumentController,
  FindOneDocController,
  SearchDocumentsController
} from '../controllers/documentController.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware } from '../../middleware/auth.js'

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

router.delete(
  '/raybags/v1/review-crawler/document/delete-profile-documents/:userId',
  authMiddleware,

  asyncMiddleware(DeleteAllUserProfileDocumentsController)
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
