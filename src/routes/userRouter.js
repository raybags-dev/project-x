import express from 'express'
import {
  LoginController,
  CreateUserController,
  GetUserController,
  GetAllUsersController,
  UpdateSubscriptionController
} from '../controllers/userController.js'
import { loginUser } from '../../middleware/auth.js'

import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'

const router = express.Router()

router.post('/raybags/v1/review-crawler/create-user', CreateUserController)
router.post('/raybags/v1/review-crawler/user/login', loginUser, LoginController)
router.post(
  '/raybags/v1/review-crawler/get-users',
  authMiddleware,
  isAdmin,
  asyncMiddleware(GetAllUsersController)
)
router.post(
  '/raybags/v1/review-crawler/get-user',
  authMiddleware,
  asyncMiddleware(GetUserController)
)
router.put(
  '/raybags/v1/review-crawler/user/:userId/subscription',
  authMiddleware,
  isAdmin,
  asyncMiddleware(UpdateSubscriptionController)
)
export default router
