import { saveObjectToS3 } from "../blobStorage/aws/s3BucketUtility.js";
import { handleAzureBlobAndPipeline } from "../blobStorage/azure/pipelines/azureOchestrator.js";

import { logger } from "../loggers/logger.js";
import { REVIEW } from "../models/documentModel.js";
import { PROFILE_MODEL } from "../models/profileModel.js";
import { USER_MODEL } from "../models/user.js";
import { fetchTripReviews } from "../spiders/tripSpider.js";
import { generateMessage } from "../utilities/utilities.js";

export async function generateTripReviews(
  req = null,
  res = null,
  contextuser = null
) {
  try {
    logger("Starting trip review extraction...", "info");

    const context_user = contextuser || req?.locals?.user;
    const { email, isAdmin, userId } = await context_user;

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
          message: "Process failed in <generateTripReviews>",
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
      reviewSiteSlug: "trip-com",
    });

    if (!userProfile || !userProfile.url) {
      logger("User profile or URL not found", "info");
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

    logger("Fetching trip reviews", "info");
    const reviewData = await fetchTripReviews(
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
          profile_id: profile_id,
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
          authorExternalId: review.id,
          author: auth_name,
        });

        if (!existingReview) {
          const rating = review.ratingInfo?.ratingAll || review.rating;
          const local_language = review.language;
          const checkin_date = review?.checkInDate;
          const create_date = review?.createDate;
          const formattedReviewBody =
            review.content || review.translatedContent;
          const property_response = {
            body: review?.feedbackList[0]?.content || null,
            responseDate: review.feedbackList[0]?.createDate,
          };

          const miscellaneous = {
            roomTypeName: extractRoomtype(review),
          };

          const recommend = review.canMarkUseful;
          const title =
            review?.commentLevel || review?.ratingInfo?.commentLevel;
          const propertyUrl = originalUrl || baseUrl;

          const review_check = review?.source === 1 ? "Ctrip" : "Trip";

          const savedReview = await REVIEW.create({
            author: auth_name,
            userId: userId,
            brandCheck: review_check,
            recommends: recommend,
            uuid: profile_id,
            siteId: internalId,
            tripType: review?.travelTypeText,
            authorReviewCount: review?.userInfo?.commentCount,
            language: local_language,
            authorExternalId: review.id,
            authorProfileUrl: originalUrl,
            externallId: propertyExternalId,
            reviewSiteSlug: reviewSiteSlug,
            reviewBody: formattedReviewBody || null,
            title: title,
            propertyProfileUrl: propertyUrl,
            originalEndpoint: originalUrl,
            reviewDate: formatDate(create_date),
            stayDate: formatDate(checkin_date),
            urlAgent: baseUrl,
            propertyName: property_name,
            propertyResponse: property_response.body ? property_response : null,
            miscellaneous: miscellaneous,
            rating: rating,
          });

          savedReviews.push(savedReview);
        }
      } catch (error) {
        logger(
          `Error processing review ID ${review?.id || "unknown"}: ${error}`,
          "warn"
        );
        continue;
      }
    }

    logger("All pages fetched. Process completed.", "info");

    let ownershipId = userId || req?.locals?.user?.userId;
    const totalCount = await REVIEW.countDocuments({ userId: ownershipId });

    const responseDataObject = {
      state: "success",
      isCompleted: res ? res.statusCode >= 200 && res.statusCode < 300 : 200,
      reviewSiteName: reviewSiteSlug,
      reviewDocumentCount: totalCount,
      accountName: property_name,
      profile_id: profile_id,
      endpoint: originalUrl,
      siteId: internalId,
      reviewPage: baseUrl,
      message: generateMessage(savedReviews, reviewData),
    };

    if (!context_user && res) res.status(200).json(responseDataObject);

    // Save bucket logic
    saveObjectToS3(savedReviews);
    handleAzureBlobAndPipeline(savedReviews, [
      "trip-com",
      profile_id,
      propertyExternalId,
    ]);
  } catch (error) {
    logger(`Error generating Trip reviews: ${error.message}`, "error");
  }
}

function extractRoomtype(review) {
  if (!review || !review.roomTypeName) return;
  try {
    return review?.roomTypeName || null;
  } catch (e) {
    logger(`from <extractNumberOfStays>: ${e.message}`);
  }
}
function extractAuthName(review) {
  try {
    if (!review) return null;
    return review.userInfo?.nickName || "Anonymous";
  } catch (e) {
    logger(`from <extractAuthName>: ${e.message}`);
  }
}
function formatDate(dateTimeString) {
  return dateTimeString.split(" ")[0];
}
