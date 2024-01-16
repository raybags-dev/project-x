import express from 'express'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'
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
  asyncMiddleware(deleteAccountProfile)
)
router.delete(
  '/raybags/v1/review-crawler/user/delete-own-profile-and-documents',
  authMiddleware,
  isAdmin,
  asyncMiddleware(deleteAccountProfileAndAllDocuments)
)
router.delete(
  '/raybags/v1/review-crawler/user/purge-user/:_id',
  authMiddleware,
  isAdmin,
  asyncMiddleware(pargeUserPrivate)
)
router.delete(
  '/raybags/v1/review-crawler/user/purge-own-user-account',
  authMiddleware,
  isAdmin,
  asyncMiddleware(pargeUserPublic)
)
router.post(
  '/raybags/v1/review-crawler/user/validate',
  authMiddleware,
  isAdmin,
  asyncMiddleware(validateCaller)
)
router.post(
  '/raybags/v1/review-crawler/user/get-profile/:_id',
  authMiddleware,
  isAdmin,
  asyncMiddleware(getAccountProfile)
)

export default router
