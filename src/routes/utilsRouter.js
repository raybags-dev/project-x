import express from 'express'
import { refreshHeaders } from '../utilities/utilities.js'

const router = express.Router()

import { asyncMiddleware } from '../../middleware/asyncErros.js'
import { authMiddleware, isAdmin } from '../../middleware/auth.js'

router.post(
  '/raybags/v1/review-crawler/profiles/refresh-headers',
  authMiddleware,
  isAdmin,
  asyncMiddleware(refreshHeaders)
)

export default router
