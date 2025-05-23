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

export async function generateAgodaReviews(req, res) {
  try {
    const { email, isAdmin, userId, _id } = await req.locals.user;
    const isSubscribed = await USER_MODEL.getSubscriptionStatus(userId);
    let depth = req.query.depth;

    if (depth === "full") {
      depth = Infinity;
    }

    if (!isSubscribed)
      return res.status(403).json({
        status: "failed",
        message: "trial period expired",
      });

    if (!isAdmin) {
      return res.status(401).json({
        error: "Something went wrong",
        message: "Reviews could not be generated from generateAgodaReviews",
      });
    }
    const savedReviews = [];
    const user = await USER_MODEL.findOne({ email });

    if (!user) {
      return res.status(404).json("User not found!");
    }

    const userProfile = await PROFILE_MODEL.findOne({
      userId: user.userId,
      reviewSiteSlug: "agoda-com",
    });

    if (!userProfile || !userProfile.url) {
      return res.status(400).json({
        status: "failed",
        message: "URL is required to complete this task",
      });
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
    } = userProfile;

    const reviewData = await fetchAgodaReviews(
      depth,
      propertyExternalId,
      userProfile
    );

    if (!reviewData.length) {
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

    for (const review of reviewData) {
      const existingReview = await REVIEW.findOne({
        authorExternalId: review.hotelReviewId,
        author: review.reviewerInfo.displayMemberName,
      });

      const {
        hotelReviewId,
        rating,
        ratingText,
        responderName,
        responseText,
        reviewComments,
        reviewNegatives,
        reviewPositives,
        reviewTitle,
        checkInDate,
        checkOutDate,
        responseDate,
        reviewDate,
        reviewerInfo: {
          countryName,
          displayMemberName,
          reviewGroupName,
          roomTypeName,
          lengthOfStay,
          reviewerReviewedCount,
          isExpertReviewer,
        },
      } = review;

      if (!existingReview) {
        const savedReview = await REVIEW.create({
          author: displayMemberName,
          country: countryName,
          userId: userId,
          uuid: profile_id,
          siteId: internalId,
          authorExternalId: hotelReviewId,
          authorProfileUrl: originalUrl,
          authorReviewCount: reviewerReviewedCount,
          reviewSiteSlug: reviewSiteSlug,
          reviewBody: formatReviewBodyString(
            reviewNegatives,
            reviewPositives,
            reviewComments
          ),
          title: `${ratingText && ratingText + ". "}${reviewTitle}`,
          propertyProfileUrl: originalUrl || baseUrl,
          originalEndpoint: originalUrl,
          reviewDate: extractISODate(reviewDate),
          checkInDate: extractISODate(checkInDate),
          checkOutDate: extractISODate(checkOutDate),
          urlAgent: baseUrl,
          propertyName: property_name,
          propertyResponse: {
            body: responseText,
            responseDate: extractISODate(responseDate),
            author: responderName,
          },
          miscellaneous: {
            roomTypeName,
            lengthOfStay,
            isExpertReviewer,
          },
          rating,
          tripType: reviewGroupName,
          subratings: review.subratings,
        });
        savedReviews.push(savedReview);
      }
    }

    logger("All pages fetched. Process completed.", "info");
    let ownershipId = userId || req.locals.user.userId;
    const totalCount = await REVIEW.countDocuments({ userId: ownershipId });

    res.status(200).json({
      state: "success",
      isCompleted: res.statusCode >= 200 && res.statusCode < 300,
      reviewSiteName: reviewSiteSlug,
      reviewDocumentCount: totalCount,
      accountName: property_name,
      profile_id: profile_id,
      endpoint: originalUrl,
      siteId: internalId,
      reviewPage: `${
        (reviewPageUrl && "https://www.agoda.com/en-gb" + reviewPageUrl) ||
        originalUrl
      }`,
      message: generateMessage(savedReviews, reviewData),
    });

    //****** Save buckets *** */
    saveObjectToS3(savedReviews);
    handleAzureBlobAndPipeline(savedReviews, [
      "agoda-com",
      profile_id,
      propertyExternalId,
    ]);
    //******* Save buckets ********* */
  } catch (error) {
    logger(`Error generating Agoda reviews: ${error.message}`, "error");
  }
}
