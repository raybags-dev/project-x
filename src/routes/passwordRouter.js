import express from 'express'
import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { loginUser } from '../../middleware/auth.js'
import { authRateLimiter } from '../../middleware/limiters.js'
import { withThrottle } from '../utils/throttler.js'

import {
  ForgotPasswordController,
  UpdatePasswordController
} from '../controllers/passwordController.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/forgot-password',
  authRateLimiter,
  withThrottle(
    '/raybags/v1/review-crawler/user/forgot-password',
    5 * 60 * 1000
  ),
  asyncMiddleware(ForgotPasswordController)
)
router.post(
  '/raybags/v1/review-crawler/user/update/password',
  loginUser,
  authRateLimiter,
  withThrottle(
    '/raybags/v1/review-crawler/user/update/password',
    5 * 60 * 1000
  ),
  UpdatePasswordController
)
export default router
