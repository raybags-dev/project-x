import { calculateObjectSize } from "bson";
import "dotenv/config";
import { PROFILE_MODEL } from "../models/profileModel.js";
import { USER_MODEL } from "../models/user.js";

const {
  CONTEXT_USER_ID,
  CONTEXT_USER_EMAIL,
  CONTEXT_USERID,
  CONTEXT_USER_TOKEN,
  CONTEXT_USER_ELEVATED_STATUS,
} = process.env;

export async function getAllSubscribedUsers(
  contextUserOverride = null,
  page = 1,
  perPage = 10
) {
  const context_user = contextUserOverride || {
    _id: CONTEXT_USER_ID,
    userId: CONTEXT_USERID,
    email: CONTEXT_USER_EMAIL,
    superUserToken: CONTEXT_USER_TOKEN,
    isSuperUser: CONTEXT_USER_ELEVATED_STATUS === "true",
    isSubscribed: true,
  };

  const skip = (page - 1) * perPage;

  const users = await USER_MODEL.aggregate([
    { $match: { _id: { $ne: context_user._id }, isSubscribed: true } },
    {
      $lookup: {
        from: "review-objects",
        localField: "_id",
        foreignField: "user",
        as: "review-objects",
      },
    },
    {
      $project: {
        "review-objects": 0,
        password: 0,
        token: 0,
        __v: 0,
      },
    },
    { $sort: { totalDocumentsOwned: -1 } },
    { $skip: skip },
    { $limit: perPage },
  ]);

  const userIds = users.map((user) => user.userId);
  const userProfiles = await PROFILE_MODEL.find({ userId: { $in: userIds } });

  const formatSize = (bytes) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    if (bytes < 1024 * 1024 * 1024)
      return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  users.forEach((user) => {
    const userProfile = userProfiles.find((profile) =>
      profile.userId.equals(user.userId)
    );
    const userData = { ...user, property_profile: userProfile };
    const sizeInBytes = calculateObjectSize(userData);
    user.property_profile = userProfile;
    user.data_size = formatSize(sizeInBytes);
  });

  const totalUserCount = await USER_MODEL.countDocuments({
    _id: { $ne: context_user._id },
    isSubscribed: true,
  });

  const pageCount = Math.ceil(totalUserCount / perPage);
  const hasMore = totalUserCount > skip + users.length;
  const nextPage = hasMore ? page + 1 : null;

  return {
    users,
    totalUserCount,
    pageCount,
    currentPage: page,
    nextPage,
  };
}
