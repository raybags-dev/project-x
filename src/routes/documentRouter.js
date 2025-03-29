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
import { customRateLimiter } from '../../middleware/limiters.js'
import { withThrottle } from '../utils/throttler.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/get-review-document/:documentId',
  authMiddleware,
  customRateLimiter({
    windowMs: 30 * 60 * 1000, // 30 minutes (30 * 60 * 1000 ms)
    max: 500, // Max 50 requests in this period
    message: 'Too many document requests'
  }),

  withThrottle(
    '/raybags/v1/review-crawler/get-review-document/:documentId',
    5 * 60 * 1000
  ),
  asyncMiddleware(FindOneDocController)
)

router.delete(
  '/raybags/v1/review-crawler/document/delete-one/:documentId',
  authMiddleware,
  customRateLimiter({
    windowMs: 30 * 60 * 1000, // 30 minutes (30 * 60 * 1000 ms)
    max: 100,
    message: 'Too many deletions'
  }),
  withThrottle(
    '/raybags/v1/review-crawler/document/delete-one/:documentId',
    5 * 60 * 1000
  ),
  asyncMiddleware(DeleteOneDocumentController)
)

router.delete(
  '/raybags/v1/review-crawler/document/delete-profile-documents/:userId',
  authMiddleware,
  customRateLimiter({
    windowMs: 30 * 60 * 1000, // 30 minutes (30 * 60 * 1000 ms)
    max: 50,
    message: 'Too many deletions'
  }),
  withThrottle(
    '/raybags/v1/review-crawler/document/delete-profile-documents/:userId',
    5 * 60 * 1000
  ),
  asyncMiddleware(DeleteAllUserProfileDocumentsController)
)

router.post(
  '/raybags/v1/review-crawler/get-user-account-review-docs',
  authMiddleware,
  customRateLimiter({
    windowMs: 30 * 60 * 1000, // 30 minutes (30 * 60 * 1000 ms)
    max: 50,
    message: 'Too many user document requests'
  }),
  withThrottle(
    '/raybags/v1/review-crawler/get-user-account-review-docs',
    5 * 60 * 1000
  ),
  asyncMiddleware(AllUserDocsController)
)
router.post(
  '/raybags/v1/review-crawler/search/:id',
  authMiddleware,
  customRateLimiter({
    windowMs: 30 * 60 * 1000, // 30 minutes (30 * 60 * 1000 ms)
    max: 1000,
    message: 'Too many searches'
  }),
  withThrottle('/raybags/v1/review-crawler/search/:id', 5 * 60 * 1000),
  asyncMiddleware(SearchDocumentsController)
)
export default router
