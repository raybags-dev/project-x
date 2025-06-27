import express from "express";
import isSubscribed from "../../middleware/generalUtils.js";
import {
  AllUserDocsController,
  DeleteAllUserProfileDocumentsController,
  DeleteOneDocumentController,
  FindOneDocController,
  SearchDocumentsController,
} from "../controllers/documentController.js";

import loadSiteSlugs from "../controllers/loadSiteslugsController.js";

import { asyncMiddleware } from "../../middleware/asyncErros.js";
import { authMiddleware } from "../../middleware/auth.js";
const router = express.Router();

router.post(
  "/raybags/v1/review-crawler/get-review-document/:documentId",
  authMiddleware,
  asyncMiddleware(FindOneDocController)
);
router.delete(
  "/raybags/v1/review-crawler/document/delete-one/:documentId",
  authMiddleware,
  isSubscribed,
  asyncMiddleware(DeleteOneDocumentController)
);

router.delete(
  "/raybags/v1/review-crawler/document/delete-profile-documents/:userId",
  authMiddleware,
  isSubscribed,
  asyncMiddleware(DeleteAllUserProfileDocumentsController)
);

router.post(
  "/raybags/v1/review-crawler/get-user-account-review-docs",
  authMiddleware,
  asyncMiddleware(AllUserDocsController)
);
router.post(
  "/raybags/v1/review-crawler/search/:id",
  authMiddleware,
  isSubscribed,
  asyncMiddleware(SearchDocumentsController)
);
router.post(
  "/raybags/v1/review-crawler/load-site-slugs",
  authMiddleware,
  asyncMiddleware(loadSiteSlugs)
);
export default router;
