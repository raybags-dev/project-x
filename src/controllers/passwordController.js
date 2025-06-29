import { sendNotificationEmail } from "../../middleware/emailer.js";
import { logger } from "../loggers/logger.js";
import { USER_MODEL } from "../models/user.js";

export async function ForgotPasswordController(req, res) {
  const email = req.body.email;
  logger(email, "info");
  const the_user = await USER_MODEL.findOne({ email: req.body.email });

  if (!the_user) {
    return res.status(409).send({
      error: `-The account for '${email}' does not exist`,
    });
  }

  const resetToken = await the_user.setPasswordResetToken();
  // send email to user for token.
  const emailData = {
    title: "Important: Request to update password",
    body: `A request to update password for account associated with email:${email} was received successfully. 
    This is your token to update your password.\nVerification Token: ${resetToken}\n\nUsage:\n- Copy the token string and paste it in the appropriate field.\n- The Token will remain active for only 24hrs.`,
  };

  try {
    await sendNotificationEmail(emailData, email);
    res.status(200).json({ message: "Password reset email sent." });
  } catch (error) {
    logger(`Error generating verification token: ${error}`, "error");
    res.status(500).json({ error: "Error generating verification token." });
  }
}
export async function UpdatePasswordController(req, res) {
  try {
    const { email, password: newPassword, verification_token } = req.body;

    if (!email || !newPassword || !verification_token) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    if (req.locals?.user?.email && req.locals.user.email !== email) {
      return res.status(403).json({ error: "Unauthorized access." });
    }

    const user = await USER_MODEL.findOne({ email });
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    if (user.password_reset_token !== verification_token) {
      return res.status(401).json({ error: "Invalid verification token." });
    }

    user.password = newPassword;
    user.password_reset_token = null;

    await user.save();

    const token = user.generateAuthToken();

    const userObject = user.toObject();
    delete userObject.password;

    const emailData = {
      title: "Important: Password Updated Successfully",
      body: `Your password for the account associated with email: ${email} has been updated successfully. If you did not initiate this change, please contact support immediately.`,
    };
    await sendNotificationEmail(emailData, email);
    res.status(200).json({ user: userObject, token });
  } catch (error) {
    logger(error.message, "error");
    res.status(500).json({ error: "Server error" });
  }
}
