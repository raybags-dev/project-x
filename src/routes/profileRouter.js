import express from 'express'
import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { customRateLimiter } from '../../middleware/limiters.js'
import { withThrottle } from '../utils/throttler.js'

import {
  deleteAccountProfile,
  deleteAccountProfileAndAllDocuments,
  getAccountProfile,
  pargeUserPrivate,
  pargeUserPublic,
  validateCaller
} from '../controllers/profileController.js'

const router = express.Router()

router.delete(
  '/raybags/v1/review-crawler/user/delete-own-profile',
  authMiddleware,
  isAdmin,
  withThrottle(
    '/raybags/v1/review-crawler/user/delete-own-profile',
    5 * 60 * 1000
  ),
  asyncMiddleware(deleteAccountProfile)
)

router.delete(
  '/raybags/v1/review-crawler/user/delete-own-profile-and-documents/:_id',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 15 * 60 * 60 * 1000,
    max: 50,
    message: 'Too many delete-all attempts'
  }),
  withThrottle(
    '/raybags/v1/review-crawler/user/delete-own-profile-and-documents/:_id',
    5 * 60 * 1000
  ),
  asyncMiddleware(deleteAccountProfileAndAllDocuments)
)

router.delete(
  '/raybags/v1/review-crawler/user/purge-user/:_id',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 15 * 60 * 60 * 1000,
    max: 50,
    message: 'Too many purge attempts'
  }),
  withThrottle(
    '/raybags/v1/review-crawler/user/purge-user/:_id',
    5 * 60 * 1000
  ),
  asyncMiddleware(pargeUserPrivate)
)

router.delete(
  '/raybags/v1/review-crawler/user/purge-own-user-account',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 15 * 60 * 60 * 1000,
    max: 50,
    message: 'Too many public purge attempts'
  }),
  withThrottle(
    '/raybags/v1/review-crawler/user/purge-own-user-account',
    5 * 60 * 1000
  ),
  asyncMiddleware(pargeUserPublic)
)

router.post(
  '/raybags/v1/review-crawler/user/validate',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 15 * 60 * 60 * 1000,
    max: 50,
    message: 'Too many validation requests'
  }),
  withThrottle('/raybags/v1/review-crawler/user/validate', 5 * 60 * 1000),
  asyncMiddleware(validateCaller)
)

router.post(
  '/raybags/v1/review-crawler/user/get-profile/:_id',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 15 * 60 * 60 * 1000,
    max: 50,
    message: 'Too many profile requests'
  }),
  withThrottle(
    '/raybags/v1/review-crawler/user/get-profile/:_id',
    5 * 60 * 1000
  ),
  asyncMiddleware(getAccountProfile)
)

export default router
