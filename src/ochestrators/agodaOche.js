import { saveObjectToS3 } from "../blobStorage/aws/s3BucketUtility.js";
import { handleAzureBlobAndPipeline } from "../blobStorage/azure/pipelines/azureOchestrator.js";
import { logger } from "../loggers/logger.js";
import { REVIEW } from "../models/documentModel.js";
import { PROFILE_MODEL } from "../models/profileModel.js";
import { USER_MODEL } from "../models/user.js";
import { fetchAgodaReviews } from "../spiders/agodaSpider.js";
import {
  extractISODate,
  formatReviewBodyString,
  generateMessage,
} from "../utilities/utilities.js";

export async function generateAgodaReviews(
  req = null,
  res = null,
  contextuser = null
) {
  try {
    logger("Starting generateAgodaReviews...", "info");

    const context_user = contextuser || req?.locals?.user;
    const { email, isAdmin, userId } = await context_user;

    const isSubscribed = context_user
      ? true
      : await USER_MODEL.getSubscriptionStatus(userId);

    let depth = context_user ? 3 : req.query.depth;
    if (depth === "full") depth = Infinity;

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
          message: "Reviews could not be generated from generateAgodaReviews",
        });
      }
      return;
    }

    const savedReviews = [];
    const user = await USER_MODEL.findOne({ email });

    if (!user) {
      logger("User not found", "info");
      if (!context_user && res) {
        return res.status(404).json("User not found!");
      }
      return;
    }

    const userProfile = await PROFILE_MODEL.findOne({
      userId: user.userId,
      reviewSiteSlug: "agoda-com",
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
    } = userProfile;

    const reviewData = await fetchAgodaReviews(
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
      const existingReview = await REVIEW.findOne({
        authorExternalId: review.hotelReviewId,
        author: review.reviewerInfo.displayMemberName,
      });

      if (!existingReview) {
        const savedReview = await REVIEW.create({
          author: review.reviewerInfo.displayMemberName,
          country: review.reviewerInfo.countryName,
          userId: userId,
          uuid: profile_id,
          siteId: internalId,
          authorExternalId: review.hotelReviewId,
          authorProfileUrl: originalUrl,
          authorReviewCount: review.reviewerInfo.reviewerReviewedCount,
          reviewSiteSlug: reviewSiteSlug,
          reviewBody: formatReviewBodyString(
            review.reviewNegatives,
            review.reviewPositives,
            review.reviewComments
          ),
          title: `${review.ratingText || ""}${review.ratingText ? ". " : ""}${
            review.reviewTitle
          }`,
          propertyProfileUrl: originalUrl || baseUrl,
          originalEndpoint: originalUrl,
          urlAgent: baseUrl,
          reviewDate: extractISODate(review.reviewDate),
          checkInDate: extractISODate(review.checkInDate),
          checkOutDate: extractISODate(review.checkOutDate),
          stayDate: extractISODate(review.checkInDate),
          propertyName: property_name,
          propertyResponse: {
            responder: review.responderName,
            body: review.responseText,
            responseDate: extractISODate(review.responseDate),
          },
          miscellaneous: {
            roomTypeName: review.reviewerInfo.roomTypeName,
            lengthOfStay: review.reviewerInfo.lengthOfStay,
            isExpertReviewer: review.reviewerInfo.isExpertReviewer,
            reviewGroupName: review.reviewerInfo.reviewGroupName,
          },
          rating: to_base_rating(review.rating),
        });

        savedReviews.push(savedReview);
      }
    }

    logger("All pages fetched. Process completed.", "info");
    const ownershipId = userId || req.locals.user.userId;
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

    saveObjectToS3(savedReviews);
    handleAzureBlobAndPipeline(savedReviews, [
      "agoda-com",
      profile_id,
      propertyExternalId,
    ]);
  } catch (error) {
    logger(`Error generating Agoda reviews: ${error.message}`, "error");
  }
}

function to_base_rating(rating) {
  const numericRating =
    typeof rating === "string" ? parseFloat(rating) : rating;
  if (isNaN(numericRating)) return null;
  return (numericRating / 2).toFixed(1);
}
