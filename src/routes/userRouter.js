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
import { withThrottle } from '../utils/throttler.js'

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/create-user',
  loginRateLimiter,
  withThrottle('/raybags/v1/review-crawler/create-user', 5 * 60 * 1000),
  CreateUserController
)
router.post(
  '/raybags/v1/review-crawler/user/login',
  loginRateLimiter,
  loginUser,
  withThrottle('/raybags/v1/review-crawler/user/login', 5 * 60 * 1000),
  LoginController
)
router.post(
  '/raybags/v1/review-crawler/get-users',
  authMiddleware,
  isAdmin,
  withThrottle('/raybags/v1/review-crawler/get-users', 5 * 60 * 1000),
  asyncMiddleware(GetAllUsersController)
)
router.post(
  '/raybags/v1/review-crawler/user/get-guest-user/:id',
  authMiddleware,
  isAdmin,
  authRateLimiter,
  withThrottle(
    '/raybags/v1/review-crawler/user/get-guest-user/:id',
    5 * 60 * 1000
  ),
  asyncMiddleware(GetUserControllerPrivate)
)
router.post(
  '/raybags/v1/review-crawler/get-user',
  authMiddleware,
  authRateLimiter,
  withThrottle('/raybags/v1/review-crawler/get-user', 5 * 60 * 1000),
  asyncMiddleware(GetUserController)
)
router.put(
  '/raybags/v1/review-crawler/user/update-subscription/:userId',
  authMiddleware,
  isAdmin,
  withThrottle(
    '/raybags/v1/review-crawler/user/update-subscription/:userId',
    5 * 60 * 1000
  ),
  asyncMiddleware(UpdateSubscriptionController)
)

export default router
