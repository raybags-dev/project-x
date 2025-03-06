import express from 'express'
import { generateExpediaProfile } from '../profileGeneratorsControllers/expediaProfileGeneratorController.js'

import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-expedia-review-profile',
  authMiddleware,
  isAdmin,
  asyncMiddleware(generateExpediaProfile)
)

export default router
