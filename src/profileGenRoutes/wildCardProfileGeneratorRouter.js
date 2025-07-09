import express from "express";
import isSubscribed from "../../middleware/generalUtils.js";
import { handleSearchRequest } from "../profileGeneratorsControllers/wildCardSearchController.js";

import { asyncMiddleware } from "../../middleware/asyncErros.js";
import { authMiddleware, isAdmin } from "../../middleware/auth.js";

const router = express.Router();

router.post(
  "/raybags/v1/review-crawler/user/profiles-builder",
  authMiddleware,
  isAdmin,
  isSubscribed,
  asyncMiddleware(handleSearchRequest)
);

export default router;
