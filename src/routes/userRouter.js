import express from 'express'
import {
  LoginController,
  CreateUserController,
  GetUserController,
  GetAllUsersController,
  UpdateSubscriptionController
} from '../controllers/userController.js'
import { loginUser } from '../../middleware/auth.js'
import { authRateLimiter, loginRateLimiter } from '../../middleware/limiters.js'

import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'

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
  authRateLimiter,
  asyncMiddleware(GetAllUsersController)
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
  authRateLimiter,
  asyncMiddleware(UpdateSubscriptionController)
)
export default router
