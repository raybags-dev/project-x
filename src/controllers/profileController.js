import "dotenv/config";
import { ObjectId } from "mongodb";
import { validateSuperUserToken } from "../../middleware/auth.js";
import { sendNotificationEmail } from "../../middleware/emailer.js";
import { logger } from "../loggers/logger.js";
import { REVIEW } from "../models/documentModel.js";
import { PROFILE_MODEL } from "../models/profileModel.js";
import { USER_ID_MODEL, USER_MODEL } from "../models/user.js";

const { RECIPIENT_EMAIL } = process.env;

import { deleteReviewsByProfileFromS3 } from "../blobStorage/aws/s3BucketUtility.js";

export async function deleteAccountProfile(req, res) {
  try {
    const userId = req.locals?.user.userId;
    const userEmail = req.locals?.user.email;

    const profile = await PROFILE_MODEL.findOne({ userId });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found for the user" });
    }

    const profileInstance = new PROFILE_MODEL(profile);
    await profileInstance.beforeDelete();

    await deleteReviewsByProfileFromS3(profile);
    await PROFILE_MODEL.deleteOne({ userId });

    const emailData = {
      title: "Account deletion notification",
      body: `This profile (${profile?.reviewSiteSlug}) has been successfully deleted. If this was a mistake, please contact support immediately.`,
    };
    await sendNotificationEmail(emailData, RECIPIENT_EMAIL);
    await sendNotificationEmail(emailData, userEmail);

    return res.status(200).json({ message: "Profile deleted successfully" });
  } catch (error) {
    logger(`Error in deleteAccountProfile: ${error}`, "error");
    return res.status(500).json({ error: "Internal Server Error" });
  }
}

export async function pargeUserPublic(req, res) {
  try {
    if (!req.locals?.user) {
      logger("Error: req.locals.user is undefined", "error");
      return res?.status(403).json({ error: "Unauthorized request" });
    }

    const { isAdmin, userId } = req.locals?.user;

    if (!isAdmin || !userId) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const review = await REVIEW.deleteMany({ userId });

    const profile = await PROFILE_MODEL.findOneAndDelete({ userId });
    if (profile) {
      await deleteAccountProfile(profile.userId);
    }

    const user = await USER_MODEL.findOneAndDelete({ userId });

    const emailData = {
      title: "Account deletion notification",
      body: `The user account with ID: ${userId} and email: ${user?.email} has been successfully deleted. All associated profiles and reviews have also been purged. If this was a mistake, please contact support immediately.`,
    };

    await sendNotificationEmail(emailData, RECIPIENT_EMAIL);
    await sendNotificationEmail(emailData, user?.email);

    return res?.status(200).json({
      message: "User and profile purged successfully!",
      details: {
        reviews: {
          isDeleted: !!review.acknowledged,
          count: review.deletedCount || 0,
        },
        profile: {
          isDeleted: !!profile,
          profileId: profile ? profile._id : null,
        },
        user: {
          isDeleted: !!user,
          userId: user ? user._id : null,
        },
      },
    });
  } catch (error) {
    logger(`Error in pargeUserPublic: ${error}`, "error");
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
export async function pargeUserPrivate(req, res) {
  try {
    const superUserToken = req.locals.user.superUserToken;
    const userIsSuperUser = USER_MODEL.isSuperUser(superUserToken);

    if (!userIsSuperUser) {
      return res.status(403).json({ error: "FORBIDDEN" });
    }

    const user_Id = req.params._id;
    if (req.locals.user._id === user_Id) {
      return res
        .status(403)
        .json({ error: "Superusers cannot delete themselves!" });
    }

    const targetUser = await USER_MODEL.findOne({ _id: user_Id });
    if (!targetUser) {
      return res.status(404).json({ message: "User not found!" });
    }

    const userId = targetUser.userId;
    const profiles = await PROFILE_MODEL.find({ userId });

    for (const userProfile of profiles) {
      await deleteReviewsByProfileFromS3(userProfile);
    }

    const [review, profileDeletion, user, userIdDeletion] = await Promise.all([
      REVIEW.deleteMany({ userId }),
      PROFILE_MODEL.deleteMany({ userId }),
      USER_MODEL.deleteOne({ _id: user_Id }),
      USER_ID_MODEL.deleteOne({ _id: userId }),
    ]);

    const emailData = {
      title: "Account deletion notification",
      body: `The user account with ID: ${userId} and email: ${targetUser.email} has been successfully deleted. All associated profiles and reviews have also been purged. If this was a mistake, please contact support immediately.`,
    };

    await sendNotificationEmail(emailData, RECIPIENT_EMAIL);
    await sendNotificationEmail(emailData, targetUser.email);

    return res.status(200).json({
      message: "User and related data purged successfully!",
      details: {
        reviews: { isDeleted: review.acknowledged, count: review.deletedCount },
        profiles: {
          isDeleted: profileDeletion.acknowledged,
          count: profileDeletion.deletedCount,
        },
        user: { isDeleted: user.acknowledged, count: user.deletedCount },
      },
    });
  } catch (error) {
    logger(`Error in pargeUserPrivate: ${error}`, "error");
    return res.status(500).json({
      error: "Internal Server Error",
      message: error.message,
    });
  }
}
export async function getAccountProfile(req, res) {
  try {
    const { userId } = req.locals.user;

    const _id = req.params._id;
    const siteSlug = req.query.slug;

    const user = await USER_MODEL.findById(_id);

    if (!user)
      return res
        .status(404)
        .json(
          `A profile associated with this user account for ${siteSlug}, could not be found`
        );

    const siteProfile = await PROFILE_MODEL.find({
      userId,
      reviewSiteSlug: siteSlug,
    });

    if (!siteProfile || !siteProfile.length)
      return res.status(404).json(`Profile could not be found!`);

    res.status(200).json(siteProfile);
  } catch (e) {
    logger(e.message, "error");
  }
}
export async function validateCaller(req, res) {
  try {
    const requestToken = req.headers["admin-token"] || "";
    const superUserToken = req.locals.user.superUserToken;

    const isValid = validateSuperUserToken(superUserToken, requestToken);

    if (isValid) {
      return res
        .status(200)
        .json({ status: "PASS", state: isValid, message: "Valid Token" });
    }

    res.status(403).json({ status: "UNAUTHORIZED", message: "Invalid Token" });
  } catch (e) {
    logger(`Error in validateCaller: ${e}`, "error");
    res.status(500).json({ status: "ERROR", message: "Internal Server Error" });
  }
}
export async function deleteAccountProfileAndAllDocuments(req, res) {
  try {
    if (!req.locals?.user) {
      logger("Error: req.locals.user is undefined", "error");
      return res.status(403).json({ error: "Unauthorized request" });
    }

    const slug = req.query.slug;
    const profileId = req.params._id;
    const { userId, _id } = req.locals.user;

    const profile = await PROFILE_MODEL.findOne({
      _id: new ObjectId(profileId),
      userId,
    });

    if (!profile) {
      return res.status(404).json({ error: "Profile not found" });
    }

    // Delete related S3 data
    await deleteReviewsByProfileFromS3(profile);

    // Remove profile reference from user
    await USER_MODEL.updateOne(
      { _id: new ObjectId(_id) },
      { $pull: { profiles: { _id: new ObjectId(profileId) } } }
    );

    // Delete profile
    await PROFILE_MODEL.findOneAndDelete({
      _id: new ObjectId(profileId),
      userId,
    });

    // Delete associated reviews
    const deleteResult = await REVIEW.deleteMany({
      userId,
      reviewSiteSlug: slug,
    });

    const emailData = {
      title: "Account deletion notification",
      body: `The user account with ID: ${userId} and email: ${req.locals?.user?.email} has been successfully deleted. All associated profiles and reviews have also been purged. If this was a mistake, please contact support immediately.`,
    };

    await sendNotificationEmail(emailData, RECIPIENT_EMAIL);
    await sendNotificationEmail(emailData, req.locals?.user?.email);

    return res.status(200).json({
      message: "Profile and associated reviews deleted successfully",
      deletedReviewsCount: deleteResult.deletedCount,
    });
  } catch (error) {
    logger(`Error in deleteAccountProfileAndAllDocuments: ${error}`, "error");
    return res.status(500).json({ error: "Internal Server Error" });
  }
}
