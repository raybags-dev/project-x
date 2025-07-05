import "dotenv/config";
import { sendNotificationEmail } from "../../middleware/emailer.js";
import EmailTemplates from "../data/email/emailTemplates.js";
import { logger } from "../loggers/logger.js";
import { REVIEW } from "../models/documentModel.js";
import { PROFILE_MODEL } from "../models/profileModel.js";
import { USER_ID_MODEL, USER_MODEL } from "../models/user.js";
import { sanitizeUser, validateRequest } from "../utilities/utilities.js";
import { getAllSubscribedUsers } from "./userUtils.js";

const {
  RECIPIENT_EMAIL,
  SECRET_ADMIN_TOKEN,
  SUPER_USER_TOKEN,
  CONTEXT_USER_TOKEN,
} = process.env;

export async function CreateUserController(req, res) {
  try {
    const validationError = validateRequest(req.body);
    if (validationError) {
      return res.status(400).send(validationError);
    }

    const secret = SECRET_ADMIN_TOKEN;
    const { name, email, password, superUserToken } = req.body;

    const isAdminUser = secret === SECRET_ADMIN_TOKEN;
    const isSuperUser = superUserToken === SUPER_USER_TOKEN;

    if (!isAdminUser && isSuperUser) {
      return res
        .status(403)
        .send({ error: "Forbidden - SuperUser must be an Admin" });
    }

    const existingUser = await USER_MODEL.findOne({ email });
    if (existingUser) {
      return res.status(409).send({ error: "User already exists" });
    }

    const newUserId = await USER_ID_MODEL.create({});
    const userId = newUserId._id;

    let user;
    const isSubscribed = false;

    if (isAdminUser || isSuperUser) {
      user = new USER_MODEL({
        name,
        email,
        password,
        userId,
        isAdmin: true,
        superUserToken,
        isSuperUser,
        isSubscribed: isSuperUser ? true : isSubscribed,
      });
    } else {
      user = new USER_MODEL({
        name,
        email,
        password,
        userId,
        isAdmin: false,
        isSubscribed,
      });
    }

    await user.save();

    const sanitizedUser = sanitizeUser(user);
    const token = user.generateAuthToken();

    const adminEmailData = EmailTemplates.userCreationAdminNotification({
      userName: sanitizedUser.name,
      userEmail: sanitizedUser.email,
      userId: sanitizedUser.userId,
      isAdmin: sanitizedUser.isAdmin,
      isSuperUser: sanitizedUser.isSuperUser,
      isSubscribed: sanitizedUser.isSubscribed,
    });

    // For user welcome email (optional)
    const welcomeEmailData = EmailTemplates.userWelcomeEmail({
      userName: sanitizedUser.name,
      userEmail: sanitizedUser.email,
      isAdmin: sanitizedUser.isAdmin,
      isSuperUser: sanitizedUser.isSuperUser,
    });

    // Send notifications
    await sendNotificationEmail(adminEmailData, RECIPIENT_EMAIL);
    await sendNotificationEmail(welcomeEmailData, sanitizedUser.email);

    res.status(201).send({
      state: "successful",
      message: "user created",
      user: { name, email, isAdmin: user.isAdmin },
      token,
    });
  } catch (error) {
    logger(`Error processing request:${error.message}`, "error");
    res.status(400).send({ error: error.message });
  }
}
export async function LoginController(req, res) {
  try {
    const user = await USER_MODEL.findOne({ email: req.body.email });
    const token = user.generateAuthToken();

    const userObject = user.toObject();
    delete userObject.password;
    res.status(200).json({ user: userObject, token });
  } catch (error) {
    logger(error.message, "error");
    res.status(500).json({ error: "Server error" });
  }
}
export async function GetUserController(req, res) {
  try {
    const email = req.locals.user.email;
    const isSuperUser = await USER_MODEL.isSuperUser(
      req.locals.user.superUserToken
    );
    let user = {};
    let updatedUser = {};
    let count;
    if (isSuperUser) {
      user = await USER_MODEL.findOne({ email });
      if (!user) return res.status(404).json("User not found!");

      const userProfiles = await PROFILE_MODEL.find({
        userId: user.userId,
      });

      count = await REVIEW.countDocuments({ userId: user.userId });
      updatedUser = {
        ...user.toObject(),
        userProfiles,
        DocumentCount: count,
      };

      res.status(200).json(updatedUser);
      return;
    }

    user = await USER_MODEL.findOne(
      { email },
      {
        token: 0,
        password: 0,
        version: 0,
        __v: 0,
        superUserToken: 0,
        isSuperUser: 0,
      }
    );

    if (!user) return res.status(404).json("User not found!");

    const userProfiles = await PROFILE_MODEL.find({
      userId: user.userId,
    });

    count = await REVIEW.countDocuments({ userID: user.userId });
    updatedUser = {
      ...user.toObject(),
      userProfiles,
      DocumentCount: count,
    };
    res.status(200).json(updatedUser);
  } catch (e) {
    logger(e, "error");
  }
}
export async function GetUserControllerPrivate(req, res) {
  try {
    const userId = req.params.id;
    const isSuperUser = await USER_MODEL.isSuperUser(
      req.locals.user.superUserToken
    );
    if (!isSuperUser)
      return res.status(401).json({ error: "Unauthorized - Not a super user" });

    const user = await USER_MODEL.findOne({ _id: userId });
    if (!user) return res.status(404).json("User not found!");

    res.status(200).json(user);
  } catch (error) {
    logger(`Error getting all users: ${error}`, "error");
    res.status(500).json({ error: "Internal Server Error" });
  }
}
export async function GetAllUsersController(req, res, respondToClient = true) {
  try {
    const isRouteRequest = !!req;
    const superToken = req?.locals?.user?.superUserToken || CONTEXT_USER_TOKEN;

    if (!superToken) {
      const errMsg = "Missing superUserToken.";
      if (respondToClient && res)
        return res.status(401).json({ error: errMsg });
      throw new Error(errMsg);
    }

    const isSuperUser = await USER_MODEL.isSuperUser(superToken);
    if (!isSuperUser) {
      const errMsg = "Unauthorized: Not a super user.";
      if (respondToClient && res)
        return res.status(401).json({ error: errMsg });
      throw new Error(errMsg);
    }

    const page = isRouteRequest
      ? parseInt(req.query.page) || 1
      : req.query?.page || 1;
    const perPage = 10;

    const { users, totalUserCount, nextPage, currentPage, pageCount } =
      await getAllSubscribedUsers(null, page, perPage);

    if (!respondToClient) return users;

    if (users.length === 0) {
      return res.status(404).json({
        profile_count: 0,
        current_page: currentPage,
        next_page: null,
        page_count: 0,
        user_profiles: [],
      });
    }

    return res.status(200).json({
      profile_count: totalUserCount,
      current_page: currentPage,
      next_page: nextPage,
      page_count: pageCount,
      user_profiles: users,
    });
  } catch (error) {
    if (respondToClient && res) {
      return res.status(500).json({ error: error.message });
    }
    throw error;
  }
}
export async function UpdateSubscriptionController(req, res) {
  try {
    const super_user_token = req.locals.user.superUserToken;
    const isSuperUser = await USER_MODEL.isSuperUser(super_user_token);

    if (!isSuperUser) {
      return res
        .status(401)
        .json({ error: "Unauthorized - Action forbidden!" });
    }

    const userIdToUpdate = req.params.userId;
    const user = await USER_MODEL.findOne({ _id: userIdToUpdate });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    const result = await USER_MODEL.setSubStatus(user, !user.isSubscribed);

    const adminEmailData = EmailTemplates.subscriptionUpdateAdminNotification({
      userName: user.name,
      userEmail: user.email,
      userId: user._id,
      newSubscriptionStatus: !user.isSubscribed,
      previousSubscriptionStatus: user.isSubscribed,
      updatedByAdmin: req.locals?.user?.name || req.locals.user.email,
    });

    const userEmailData = EmailTemplates.subscriptionUpdateUserNotification({
      userName: user.name,
      newSubscriptionStatus: !user.isSubscribed,
    });

    await sendNotificationEmail(adminEmailData, RECIPIENT_EMAIL);
    await sendNotificationEmail(userEmailData, user.email);

    res.status(200).json({
      state: "Success",
      message: "Subscription status updated!",
      isSubscribed: result.success ? !user.isSubscribed : user.isSubscribed,
    });
  } catch (error) {
    logger(`Error updating subscription status: ${error}`, "error");
    res.status(500).json({ error: "Internal Server Error" });
  }
}
