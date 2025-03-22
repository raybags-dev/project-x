import express from 'express'
import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { loginUser } from '../../middleware/auth.js'
import { authRateLimiter } from '../../middleware/limiters.js'
import {
  ForgotPasswordController,
  UpdatePasswordController
} from '../controllers/passwordController.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/forgot-password',
  authRateLimiter,
  asyncMiddleware(ForgotPasswordController)
)
router.post(
  '/raybags/v1/review-crawler/user/update/password',
  loginUser,
  authRateLimiter,
  UpdatePasswordController
)
export default router
