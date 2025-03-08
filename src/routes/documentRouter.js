import express from 'express'
import {
  FindOneDocController,
  DeleteOneDocumentController,
  AllUserDocsController,
  SearchDocumentsController
} from '../controllers/documentController.js'

import { authMiddleware } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { customRateLimiter } from '../../middleware/limiters.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/get-review-document/:documentId',
  authMiddleware,
  customRateLimiter({
    windowMs: 10 * 60 * 1000,
    max: 50,
    message: 'Too many document requests'
  }),

  asyncMiddleware(FindOneDocController)
)
router.delete(
  '/raybags/v1/review-crawler/document/delete-one/:documentId',
  authMiddleware,
  customRateLimiter({
    windowMs: 30 * 60 * 1000,
    max: 10,
    message: 'Too many deletions'
  }),
  asyncMiddleware(DeleteOneDocumentController)
)
router.post(
  '/raybags/v1/review-crawler/get-user-account-review-docs',
  authMiddleware,
  customRateLimiter({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: 'Too many user document requests'
  }),
  asyncMiddleware(AllUserDocsController)
)
router.post(
  '/raybags/v1/review-crawler/search/:id',
  authMiddleware,
  customRateLimiter({
    windowMs: 5 * 60 * 1000,
    max: 20,
    message: 'Too many searches'
  }),
  asyncMiddleware(SearchDocumentsController)
)
export default router
