import { saveObjectToS3 } from "../blobStorage/aws/s3BucketUtility.js";
import { handleAzureBlobAndPipeline } from "../blobStorage/azure/pipelines/azureOchestrator.js";

import { logger } from "../loggers/logger.js";
import { REVIEW } from "../models/documentModel.js";
import { PROFILE_MODEL } from "../models/profileModel.js";
import { USER_MODEL } from "../models/user.js";
import { fetchOpentableReviews } from "../spiders/opentableSpider.js";
import {
  extractISODate,
  formatReviewBodyString,
  generateMessage,
} from "../utilities/utilities.js";

export async function generateOpentableReviews(
  req = null,
  res = null,
  context_user = null
) {
  try {
    logger("Starting generateOpentableReviews...", "info");

    const userContext = context_user || req?.locals?.user;
    const { email, isAdmin, userId } = await userContext;
    const isSubscribed = context_user
      ? true
      : await USER_MODEL.getSubscriptionStatus(userId);

    let depth = context_user ? 3 : req.query.depth;

    if (!isSubscribed) {
      logger("User subscription expired", "info");
      if (!context_user && res) {
        return res.status(403).json({
          status: "failed",
          message: "trial period expired",
        });
      }
      return;
    }

    if (!isAdmin) {
      logger("User is not an admin", "info");
      if (!context_user && res) {
        return res.status(401).json({
          error: "Something went wrong",
          message: "Process failed in <generateOpentableReviews>",
        });
      }
      return;
    }

    const savedReviews = [];
    const user = await USER_MODEL.findOne({ email });

    if (!user) {
      logger("User not found", "info");
      if (!context_user && res) return res.status(404).json("User not found!");
      return;
    }

    const userProfile = await PROFILE_MODEL.findOne({
      userId: user.userId,
      reviewSiteSlug: "opentable-com",
    });

    if (!userProfile || !userProfile.url) {
      logger("User profile not found", "info");
      if (!context_user && res) {
        return res.status(400).json({
          status: "failed",
          message: "URL is required to complete this task",
        });
      }
      return;
    }

    const {
      url: baseUrl,
      propertyExternalId,
      name: property_name,
      internalId,
      originalUrl,
      _id: profile_id,
      reviewSiteSlug,
      propertyReviewCount,
    } = userProfile;

    if (depth === "full") {
      depth = propertyReviewCount || Infinity;
    }

    logger("Fetching opentable reviews", "info");
    const reviewData = await fetchOpentableReviews(
      depth,
      propertyExternalId,
      userProfile
    );

    if (!reviewData.length) {
      logger("Review list is empty", "warn");
      if (!context_user && res) {
        return res.status(404).json({
          state: "nothing found",
          isCompleted: false,
          reviewSiteName: reviewSiteSlug,
          reviewDocumentCount: null,
          accountName: property_name,
          profile_id,
          endpoint: originalUrl,
          siteId: internalId,
          reviewPage: baseUrl,
          message: [],
        });
      }
      return;
    }

    for (const review of reviewData) {
      try {
        if (!review) continue;

        const auth_name = await extractAuthName(review);
        const existingReview = await REVIEW.findOne({
          authorExternalId: review.reviewId,
          author: auth_name,
        });

        if (!existingReview) {
          const savedReview = await REVIEW.create({
            author: auth_name,
            userId,
            uuid: profile_id,
            siteId: internalId,
            authorReviewCount: review.user?.numOfApprovedReviews,
            authorExternalId: review.reviewId,
            authorProfileUrl: originalUrl,
            externallId: propertyExternalId,
            reviewSiteSlug,
            reviewBody: formatReviewBodyString(null, null, review?.text),
            title: review?.rating?.noise,
            subratings: extractSubratingsIntoList(review?.rating),
            propertyProfileUrl: originalUrl || baseUrl,
            originalEndpoint: originalUrl,
            reviewDate: extractISODate(review?.submittedDateTime),
            stayDate: extractISODate(review?.dinedDateTime),
            urlAgent: baseUrl,
            propertyName: property_name,
            propertyResponse: review?.publicRestaurantReply?.message
              ? {
                  body: review?.publicRestaurantReply?.message,
                  responseDate: extractISODate(
                    review?.publicRestaurantReply?.responseDateTimeUtc
                  ),
                }
              : null,
            miscellaneous: {
              location: review.user?.metro?.displayName,
              initials: review?.user?.initials,
              isVip: review.user?.isVip,
            },
            rating: review.rating?.overall,
          });

          savedReviews.push(savedReview);
        }
      } catch (error) {
        logger(
          `Error processing review ID ${
            review?.reviewId || "unknown"
          }: ${error}`,
          "warn"
        );
        continue;
      }
    }

    logger("All pages fetched. Process completed.", "info");
    const ownershipId = userId || req.locals.user.userId;
    const totalCount = await REVIEW.countDocuments({ userId: ownershipId });

    const responseDataObject = {
      state: "success",
      isCompleted: res ? res.statusCode >= 200 && res.statusCode < 300 : true,
      reviewSiteName: reviewSiteSlug,
      reviewDocumentCount: totalCount,
      accountName: property_name,
      profile_id,
      endpoint: originalUrl,
      siteId: internalId,
      reviewPage: baseUrl,
      message: generateMessage(savedReviews, reviewData),
    };

    // Save to cloud storage
    saveObjectToS3(savedReviews);
    handleAzureBlobAndPipeline(savedReviews, [
      "opentable-com",
      profile_id,
      propertyExternalId,
    ]);

    if (!context_user && res) {
      return res.status(200).json(responseDataObject);
    } else {
      return responseDataObject;
    }
  } catch (error) {
    logger(`Error generating opentable reviews: ${error}`, "warn");
    if (!context_user && res) {
      return res.status(500).json({ error: "Internal Server Error" });
    }
  }
}

function extractAuthName(review) {
  try {
    if (!review) return null;
    return review.user?.nickname || "Anonymous";
  } catch (e) {
    logger(`from <extractAuthName>: ${e.message}`);
  }
}
function extractSubratingsIntoList(ratingObj) {
  return Object.entries(ratingObj)
    .filter(
      ([key, value]) =>
        key !== "value" && key !== "overall" && typeof value === "number"
    )
    .map(([key, value]) => ({ key, value }));
}
