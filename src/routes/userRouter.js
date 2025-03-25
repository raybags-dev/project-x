import express from 'express'
import { loginUser } from '../../middleware/auth.js'
import { authRateLimiter, loginRateLimiter } from '../../middleware/limiters.js'
import {
  CreateUserController,
  GetAllUsersController,
  GetUserController,
  GetUserControllerPrivate,
  LoginController,
  UpdateSubscriptionController
} from '../controllers/userController.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/create-user',
  loginRateLimiter,
  CreateUserController
)
router.post(
  '/raybags/v1/review-crawler/user/login',
  loginRateLimiter,
  loginUser,
  LoginController
)
router.post(
  '/raybags/v1/review-crawler/get-users',
  authMiddleware,
  isAdmin,
  asyncMiddleware(GetAllUsersController)
)
router.post(
  '/raybags/v1/review-crawler/user/get-guest-user/:id',
  authMiddleware,
  isAdmin,
  authRateLimiter,
  asyncMiddleware(GetUserControllerPrivate)
)
router.post(
  '/raybags/v1/review-crawler/get-user',
  authMiddleware,
  authRateLimiter,
  asyncMiddleware(GetUserController)
)
router.put(
  '/raybags/v1/review-crawler/user/update-subscription/:userId',
  authMiddleware,
  isAdmin,
  asyncMiddleware(UpdateSubscriptionController)
)

export default router
