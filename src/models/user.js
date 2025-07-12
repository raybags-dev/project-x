import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import "dotenv/config";
import mongoose from "mongoose";
import { generateToken } from "../../middleware/auth.js";
import { logger } from "../loggers/logger.js";

const { SUPER_USER_TOKEN } = process.env;
const userIdSchema = new mongoose.Schema({}, { timestamps: true });

const userModel = {
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 5,
    maxlength: 50,
  },
  email: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 255,
    unique: true,
  },
  password: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 1024,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  isAccountConfirmed: {
    type: Boolean,
    default: false,
  },
  accountConfirmationToken: {
    type: String,
  },
  accountConfirmationExpires: {
    type: Date,
  },
  isSuperUser: {
    type: Boolean,
    default: false,
  },
  superUserToken: {
    type: String,
    default: null,
  },
  isSubscribed: {
    type: Boolean,
    default: false,
  },
  profiles: {
    type: [
      {
        _id: String,
        name: String,
        slug: String,
        url: String,
        originalUrl: String,
        propertyType: String,
        uuid: String,
        propertyEndpoints: [mongoose.Schema.Types.Mixed],
      },
    ],
    default: null,
  },
  version: {
    type: Number,
    default: 0,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "UserId",
    required: true,
  },
  hasReviewProfile: {
    type: Boolean,
    default: false,
  },
  password_reset_token: {
    type: String,
  },
};
const userSchema = new mongoose.Schema(userModel, {
  timestamps: true,
  toJSON: { virtuals: true },
});
userSchema.virtual("passwordResetToken").get(function () {
  return generatePasswordResetToken();
});
userSchema.methods.setPasswordResetToken = async function () {
  this.password_reset_token = await generatePasswordResetToken();
  await this.save();
  return this.password_reset_token;
};
userSchema.methods.generateAuthToken = function () {
  const payload = {
    _id: this._id,
    email: this.email,
    isAdmin: this.isAdmin,
    isSuperUser: this.isSuperUser || false,
    version: this.version,
    superUserToken: this.superUserToken || null,
  };

  return generateToken(payload, this.isSuperUser);
};
userSchema.methods.comparePassword = async function (password) {
  return bcrypt.compare(password, this.password);
};
userSchema.statics.findByCredentials = async function (email, password) {
  const user = await this.findOne({ email });
  if (!user) {
    throw new Error("Invalid login credentials");
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error("Invalid login credentials");
  }
  return user;
};
userSchema.statics.isSuperUser = async function (superUserToken) {
  if (!superUserToken) return false;
  const user = await this.findOne({ superUserToken });
  if (
    !user ||
    !user.isSuperUser ||
    superUserToken !== user.superUserToken ||
    SUPER_USER_TOKEN !== superUserToken
  ) {
    return false;
  }
  return true;
};
userSchema.statics.getSubscriptionStatus = async function (userId) {
  const user = await this.findOne({ userId });
  return user ? user.isSubscribed : null;
};
userSchema.statics.setSubStatus = async function (user, subStatus) {
  try {
    if (user) {
      user.isSubscribed = subStatus;
      await user.save();
      const statusMessage = subStatus ? "subscribed" : "unsubscribed";
      return { success: true, message: `User ${statusMessage} successfully` };
    }
  } catch (error) {
    logger(`Error updating subscription status: ${error.message}`, "error");
    return { success: false, message: "Subscription status update failed" };
  }
};
userSchema.statics.isOwner = async function (userId, targetId) {
  const user = await this.findById(userId);
  return user && user.userId.toString() === targetId.toString();
};
userSchema.statics.createWithConfirmation = async function ({
  name,
  email,
  password,
  isAdmin = false,
  isSuperUser = false,
  superUserToken = null,
  userId,
}) {
  const confirmationToken = randomBytes(32).toString("hex");
  const confirmationExpires = Date.now() + 24 * 60 * 60 * 1000;

  const user = new this({
    name,
    email,
    password,
    isAdmin,
    isSuperUser,
    superUserToken,
    userId,
    isSubscribed: isSuperUser,
    accountConfirmationToken: confirmationToken,
    accountConfirmationExpires: confirmationExpires,
    isAccountConfirmed: false,
  });

  await user.save();
  return user;
};
userSchema.statics.confirmAccount = async function (token, email) {
  const user = await this.findOne({
    email,
    accountConfirmationToken: token,
    accountConfirmationExpires: { $gt: new Date() },
  });

  if (!user) {
    throw new Error("Invalid or expired confirmation link.");
  }

  if (user.isAccountConfirmed) {
    throw new Error("Account is already confirmed.");
  }

  user.isAccountConfirmed = true;
  user.accountConfirmationToken = null;
  user.accountConfirmationExpires = null;

  user.markModified("accountConfirmationToken");
  user.markModified("accountConfirmationExpires");

  await user.save();

  return user;
};
userSchema.statics.deleteUnconfirmedUserIfExpired = async function (user) {
  if (!user) {
    return {
      statusCode: 404,
      deleted: false,
      remainingTimeMs: 0,
      message: "User not provided.",
    };
  }

  if (user.isAccountConfirmed) {
    return {
      statusCode: 400,
      deleted: false,
      remainingTimeMs: 0,
      message: "User is already confirmed.",
    };
  }

  const now = Date.now();
  const expiresAt = user.accountConfirmationExpires
    ? user.accountConfirmationExpires.getTime()
    : 0;
  const remainingTimeMs = expiresAt > now ? expiresAt - now : 0;

  if (expiresAt && now > expiresAt) {
    await this.deleteOne({ _id: user._id });
    return {
      statusCode: 410,
      deleted: true,
      remainingTimeMs: 0,
      message: "Unconfirmed user deleted after grace period expired.",
    };
  }

  return {
    statusCode: 200,
    deleted: false,
    remainingTimeMs,
    message: "User still within grace period.",
  };
};
userSchema.pre("save", async function (next) {
  if (this.isModified("password")) {
    this.password = bcrypt.hashSync(this.password, 8);
  }
  if (this.isModified("password") || this.isNew) {
    this.version = this.version + 1;
  }
  if (this.superUserToken) {
    const isSuperUser = await USER_MODEL.isSuperUser(this.superUserToken);
    if (isSuperUser) {
      this.isSubscribed = true;
    }
  }
  next();
});
export async function generatePasswordResetToken() {
  const token = randomBytes(64).toString("hex");
  return token;
}

const USER_MODEL = mongoose.model("User", userSchema);
const USER_ID_MODEL = mongoose.model("UserId", userIdSchema);
export { USER_ID_MODEL, USER_MODEL };
