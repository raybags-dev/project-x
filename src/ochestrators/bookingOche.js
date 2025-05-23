import { saveObjectToS3 } from "../blobStorage/aws/s3BucketUtility.js";
import { handleAzureBlobAndPipeline } from "../blobStorage/azure/pipelines/azureOchestrator.js";

import { logger } from "../loggers/logger.js";
import { REVIEW } from "../models/documentModel.js";
import { PROFILE_MODEL } from "../models/profileModel.js";
import { USER_MODEL } from "../models/user.js";
import { fetchBookingReviews } from "../spiders/bookingSpider.js";
import {
  convertUnixToDate,
  formatReviewBodyString,
  generateMessage,
} from "../utilities/utilities.js";

export async function generateBookingComReviews(
  req = null,
  res = null,
  contextuser = null
) {
  try {
    logger("Starting generateBookingComReviews...", "info");

    const context_user = contextuser || req?.locals?.user;

    const { email, isAdmin, userId } = await context_user;
    const isSubscribed = context_user
      ? true
      : await USER_MODEL.getSubscriptionStatus(userId);

    let depth = context_user ? 3 : req.query.depth;

    if (!isSubscribed) {
      logger("User subscription expired", "info");
      if (!context_user) {
        if (res) {
          return res.status(403).json({
            status: "failed",
            message: "trial period expired",
          });
        }
      }
    }

    if (!isAdmin) {
      logger("User is not an admin", "info");
      if (!context_user && res) {
        return res.status(401).json({
          error: "Something went wrong",
          message: "Process failed in  <generateBookingComReviews>",
        });
      }
      return;
    }
    const savedReviews = [];
    const user = await USER_MODEL.findOne({ email });

    if (!user) {
      logger("User not found", "info");
      if (!context_user && res) return res.status(404).json("User not found!");
    }

    const userProfile = await PROFILE_MODEL.findOne({
      userId: user.userId,
      reviewSiteSlug: "booking-com",
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
      reviewPageUrl,
      propertyReviewCount,
    } = userProfile;

    if (depth === "full") {
      depth = (propertyReviewCount && propertyReviewCount) || Infinity;
    }

    logger("Fetching booking reviews", "info");
    const reviewData = await fetchBookingReviews(
      depth,
      propertyExternalId,
      userProfile
    );

    if (!reviewData.length) {
      logger("Review list is empty", "warn");
      if (!context_user && res) {
        logger("Review list is empty", "warn");
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
    }

    for (const review of reviewData) {
      const existingReview = await REVIEW.findOne({
        authorExternalId: review.reviewUrl,
        author: review.guestDetails.username,
      });

      if (!existingReview) {
        const savedReview = await REVIEW.create({
          author: review.guestDetails?.username,
          country: review.guestDetails?.countryName,
          userId: userId,
          recommends: review.isApproved,
          uuid: profile_id,
          siteId: internalId,
          language: review.textDetails?.lang,
          authorExternalId: review.reviewUrl,
          authorProfileUrl: originalUrl,
          externallId: propertyExternalId,
          reviewSiteSlug: reviewSiteSlug,
          reviewBody: formatReviewBodyString(
            review.textDetails?.negativeText,
            review.textDetails?.positiveText
          ),
          title: review.textDetails.title,
          propertyProfileUrl: originalUrl || baseUrl,
          originalEndpoint: originalUrl,
          reviewDate: convertUnixToDate(review.reviewedDate),
          checkInDate: review.bookingDetails.checkinDate,
          checkOutDate: review.bookingDetails.checkoutDate,
          stayDate: review.bookingDetails.checkinDate,
          urlAgent: baseUrl,
          propertyName: property_name,
          propertyResponse: {
            body: review.partnerReply?.reply,
          },
          isApproved: review?.isApproved,
          miscellaneous: {
            roomTypeName: review.bookingDetails.roomType?.name,
            roomId: review.bookingDetails.roomType.id,
            lengthOfStay: review.bookingDetails.numNights,
          },
          rating: to_base_rating(review.reviewScore),
          tripType: review.bookingDetails.customerType,
          stayStatus: review.bookingDetails.stayStatus,
        });
        savedReviews.push(savedReview);
      }
    }

    logger("All pages fetched. Process completed.", "info");
    let ownershipId = userId || req.locals.user.userId;
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

    //****** Save buckets *** */
    saveObjectToS3(savedReviews);
    handleAzureBlobAndPipeline(savedReviews, [
      "booking-com",
      profile_id,
      propertyExternalId,
    ]);
  } catch (error) {
    logger(`Error generating Booking reviews: ${error.message}`, "error");
  }
}

function to_base_rating(rating) {
  const numericRating =
    typeof rating === "string" ? parseFloat(rating) : rating;
  if (isNaN(numericRating)) return null;
  return (numericRating / 2).toFixed(1);
}
