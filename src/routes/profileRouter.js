import express from 'express'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { customRateLimiter } from '../../middleware/limiters.js'

import {
  deleteAccountProfile,
  deleteAccountProfileAndAllDocuments,
  pargeUserPrivate,
  pargeUserPublic,
  validateCaller,
  getAccountProfile
} from '../controllers/profileController.js'

const router = express.Router()

router.delete(
  '/raybags/v1/review-crawler/user/delete-own-profile',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 10,
    message: 'Too many deletion attempts'
  }),
  asyncMiddleware(deleteAccountProfile)
)

router.delete(
  '/raybags/v1/review-crawler/user/delete-own-profile-and-documents/:_id',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 2 * 60 * 60 * 1000,
    max: 20,
    message: 'Too many delete-all attempts'
  }),
  asyncMiddleware(deleteAccountProfileAndAllDocuments)
)

router.delete(
  '/raybags/v1/review-crawler/user/purge-user/:_id',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 2 * 60 * 60 * 1000,
    max: 10,
    message: 'Too many purge attempts'
  }),
  asyncMiddleware(pargeUserPrivate)
)

router.delete(
  '/raybags/v1/review-crawler/user/purge-own-user-account',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 2 * 60 * 60 * 1000,
    max: 10,
    message: 'Too many public purge attempts'
  }),
  asyncMiddleware(pargeUserPublic)
)

// Validate Caller - Medium Limit (Max 30 per 30 minutes)
router.post(
  '/raybags/v1/review-crawler/user/validate',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 30 * 60 * 1000,
    max: 30,
    message: 'Too many validation requests'
  }),
  asyncMiddleware(validateCaller)
)

router.post(
  '/raybags/v1/review-crawler/user/get-profile/:_id',
  authMiddleware,
  isAdmin,
  customRateLimiter({
    windowMs: 60 * 60 * 1000,
    max: 100,
    message: 'Too many profile requests'
  }),
  asyncMiddleware(getAccountProfile)
)

export default router
