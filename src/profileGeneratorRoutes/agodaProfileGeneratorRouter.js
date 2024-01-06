import express from 'express'
import { generateAgodaProfile } from '../profileGeneratorsControllers/agodaProfileGeneratorController.js'

import { authMiddleware, isAdmin } from '../../middleware/auth.js'
import { asyncMiddleware } from '../../middleware/asyncErros.js'

const router = express.Router()

router.post(
  '/raybags/v1/review-crawler/user/create-agoda-review-profile',
  authMiddleware,
  isAdmin,
  asyncMiddleware(generateAgodaProfile)
)

export default router
