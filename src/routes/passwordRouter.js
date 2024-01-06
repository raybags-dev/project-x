import express from 'express'
import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { loginUser } from '../../middleware/auth.js'
import {
  ForgotPasswordController,
  UpdatePasswordController
} from '../controllers/passwordController.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/forgot-password',
  asyncMiddleware(ForgotPasswordController)
)
router.post(
  '/raybags/v1/review-crawler/user/update/password',
  loginUser,
  UpdatePasswordController
)
export default router
