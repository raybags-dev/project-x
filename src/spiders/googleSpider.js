import "dotenv/config";
import { HEADERS } from "../data/headers/headers.js";
import { logger } from "../loggers/logger.js";
import { REVIEW } from "../models/documentModel.js";
import { PROFILE_MODEL } from "../models/profileModel.js";
import { USER_MODEL } from "../models/user.js";
import headlessManager from "../ochestrators/googleOche.js";

const isProduction = process.env.NODE_ENV === "production";

export async function generateGoogleReviews(
  req = null,
  res = null,
  contextuser = null
) {
  try {
    const context_user = contextuser || req?.locals?.user;

    const { email, isAdmin, userId } = await context_user;
    const isSubscribed = contextuser
      ? true
      : await USER_MODEL.getSubscriptionStatus(userId);

    if (!isSubscribed) {
      logger("User subscription expired", "info");
      if (!contextuser && res) {
        return res.status(403).json({
          status: "failed",
          message: "trial period expired",
        });
      }
      return;
    }

    if (!isAdmin) {
      logger("User is not an admin", "info");
      if (!contextuser && res) {
        return res.status(401).json({
          error: "Something went wrong",
          message: "Reviews could not be generated from generateGoogleReviews",
        });
      }
      return;
    }

    const user = await USER_MODEL.findOne({ email });
    if (!user) {
      logger("User not found", "info");
      if (!contextuser && res) {
        return res.status(404).json("User not found!");
      }
      return;
    }

    const userProfile = await PROFILE_MODEL.findOne({
      userId: user.userId,
      reviewSiteSlug: "google-com",
    });

    if (!userProfile || !userProfile.url) {
      logger("User profile or URL not found", "info");
      if (!contextuser && res) {
        return res.status(400).json({
          status: "failed",
          message: "URL is required to complete this task",
        });
      }
      return;
    }

    const {
      url: baseUrl,
      computedUrl,
      name: property_name,
      internalId,
      _id: profile_id,
      originalUrl,
    } = userProfile;

    const headers = HEADERS.googleHeadersGenProfile;
    const depth = contextuser ? 3 : req?.query?.depth;
    const runType = await PROFILE_MODEL.nextRunType(req, res);

    if (isProduction && !contextuser && res) {
      res.status(200).json({
        state: "in progress",
        isCompleted: false,
        reviewSiteName: userProfile.reviewSiteSlug,
        reviewDocumentCount: null,
        accountName: userProfile.name,
        profile_id: profile_id,
        endpoint: userProfile.computedUrl,
        siteId: internalId,
        message: "Please check back again later for review data.",
      });
    }

    const reviewsList = await headlessManager(
      baseUrl,
      depth,
      runType,
      headers,
      {
        userId: user.userId,
        slug: userProfile.reviewSiteSlug,
        id: userProfile._id,
      }
    );

    for (const review of reviewsList) {
      const existingReview = await REVIEW.findOne({
        authorExternalId: review.authorExternalId,
        author: review.author,
      });

      if (!existingReview) {
        await REVIEW.create({
          author: review.author,
          userId: user.userId,
          siteId: internalId,
          uuid: profile_id,
          authorExternalId: review.authorExternalId,
          authorProfileUrl: review.authorProfileUrl,
          reviewSiteSlug: review.reviewSiteSlug,
          reviewBody: review.reviewBody,
          propertyProfileUrl: computedUrl || review.propertyProfileUrl,
          originalEndpoint: originalUrl,
          reviewDate: review.reviewDate,
          urlAgent: baseUrl || review.propertyProfileUrl,
          propertyName: property_name || "compute failed",
          propertyResponse: review.propertyResponse,
          rating: review.rating,
          tripType: review.tripType,
          subratings: review.subratings,
        });
      }
    }

    const totalReviewCount = reviewsList.length;
    await PROFILE_MODEL.updateOne(
      { userId: user.userId },
      { $set: { propertyReviewCount: totalReviewCount } }
    );

    if (runType === "INITIAL") {
      await PROFILE_MODEL.updateOne(
        { userId: user.userId },
        { $set: { nextRunType: "REGULAR" } }
      );
    }

    logger("All pages fetched. Process completed.", "info");

    let ownershipId = userProfile.userId || userId;
    const totalCount = await REVIEW.countDocuments({ userId: ownershipId });

    const responseDataObject = {
      state: "success",
      isCompleted: res ? res.statusCode >= 200 && res.statusCode < 300 : 200,
      reviewSiteName: userProfile.reviewSiteSlug,
      reviewDocumentCount: totalCount,
      accountName: userProfile.name,
      profile_id: profile_id,
      endpoint: userProfile.computedUrl,
      siteId: internalId,
      message: "completed!",
    };

    if (!contextuser && res && !isProduction) {
      return res.status(200).json(responseDataObject);
    }
  } catch (error) {
    logger(`Error fetching reviews: ${error}`, "error");
    if (!contextuser && res) {
      res.status(500).json({ error: "Server error" });
    }
  }
}
