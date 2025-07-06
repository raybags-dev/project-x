export default class EmailTemplates {
  static forgotPassword({
    email,
    resetToken,
    includeEmail = true,
    companyName = "raybags.com",
    validHours = 24,
  }) {
    const emailReference = includeEmail ? ` associated with ${email}` : "";

    return {
      title: "Password Reset Request",
      body: `We received a request to reset the password for your account${emailReference}.

If you initiated this request, please use the verification token below to proceed with resetting your password:

🔐 Verification Token: ${resetToken}

Instructions:
- Copy and paste the token into the designated field in the password reset form.
- This token is valid for ${validHours} hours. After that, it will expire for security reasons.

---

If you did not request this password reset, please disregard this message. No changes will be made to your account.

If you continue to receive unexpected password reset requests, please contact our support team immediately.

Thank you,
The ${companyName} Team`,
    };
  }
  static passwordChangedNotification({ email, companyName = "raybags.com" }) {
    return {
      title: "Your Password Was Changed",
      body: `
Your password has been successfully changed for the account associated with this email: ${email}.

If you did **not** perform this action, please contact our support team immediately to secure your account.

Thank you,  
The ${companyName} Team
      `.trim(),
    };
  }
  static profileDeletionAdminNotification({
    userId,
    userEmail,
    reviewSiteSlug,
    deletedCount,
    companyName = "raybags.com",
  }) {
    return {
      title: "🚨 User Profile Deletion Alert",
      body: `
ALERT: User Profile and Documents Deleted

**User Details:**
- User ID: ${userId}
- Email: ${userEmail}
- Profile Slug: ${reviewSiteSlug}
- Documents Deleted: ${deletedCount}

**Action Required:**
This is an automated notification of a user-initiated profile deletion. Please review if necessary.

If this deletion appears suspicious or unauthorized, please investigate immediately.

---
System Notification from ${companyName}
Generated on: ${new Date().toLocaleString()}
    `.trim(),
    };
  }
  static profileDeletionUserConfirmation({
    userEmail,
    reviewSiteSlug,
    deletedCount,
    companyName = "raybags.com",
  }) {
    return {
      title: "Profile Deletion Confirmation",
      body: `
Your profile and documents have been successfully deleted.

**Deletion Summary:**
- Profile: ${reviewSiteSlug}
- Documents Removed: ${deletedCount}
- Account Email: ${userEmail}

**Important Notes:**
- This action is permanent and cannot be undone
- All associated reviews and documents have been permanently removed
- Your account remains active, but this specific profile has been deleted

If you did **not** initiate this deletion, please contact our support team immediately at support@${companyName}.

If you have any questions or need assistance, we're here to help.

Thank you,
The ${companyName} Team
    `.trim(),
    };
  }
  static userCreationAdminNotification({
    userName,
    userEmail,
    userId,
    isAdmin,
    isSuperUser,
    isSubscribed,
    companyName = "raybags.com",
  }) {
    const userType = isSuperUser
      ? "Super User"
      : isAdmin
      ? "Admin"
      : "Regular User";
    const subscriptionStatus = isSubscribed ? "Subscribed" : "Not Subscribed";

    return {
      title: "🔔 New User Account Created",
      body: `
A new user account has been successfully created in the system.

**User Details:**
- Name: ${userName}
- Email: ${userEmail}
- User ID: ${userId}
- Account Type: ${userType}
- Subscription Status: ${subscriptionStatus}

**Account Permissions:**
- Admin Access: ${isAdmin ? "✅ Yes" : "❌ No"}
- Super User Access: ${isSuperUser ? "✅ Yes" : "❌ No"}

**Next Steps:**
${
  isAdmin || isSuperUser
    ? "⚠️  This user has elevated privileges. Please verify this registration is authorized."
    : "No additional action required for regular user account."
}

---
System Notification from ${companyName}
Generated on: ${new Date().toLocaleString()}
    `.trim(),
    };
  }
  static userWelcomeEmail({
    userName,
    userEmail,
    isAdmin,
    isSuperUser,
    companyName = "raybags.com",
  }) {
    const accountType = isSuperUser
      ? "Super User"
      : isAdmin
      ? "Admin"
      : "Member";

    return {
      title: `Welcome to ${companyName}! 🎉`,
      body: `
Hi ${userName},

Welcome to ${companyName}! Your account has been successfully created.

**Your Account Details:**
- Email: ${userEmail}
- Account Type: ${accountType}
${
  isAdmin || isSuperUser
    ? "- Access Level: Administrative privileges enabled"
    : ""
}

**What's Next?**
${
  isAdmin || isSuperUser
    ? `As an ${accountType.toLowerCase()}, you have access to administrative features. Please review the admin documentation and contact support if you need assistance.`
    : "You can now start using all the features available to you. Explore your dashboard and let us know if you need any help getting started."
}

**Need Help?**
If you have any questions or need assistance, don't hesitate to reach out to our support team.

Thank you for joining us!

Best regards,
The ${companyName} Team
    `.trim(),
    };
  }
  static subscriptionUpdateAdminNotification({
    userName,
    userEmail,
    userId,
    newSubscriptionStatus,
    previousSubscriptionStatus,
    updatedByAdmin,
    companyName = "raybags.com",
  }) {
    const statusChange = newSubscriptionStatus ? "SUBSCRIBED" : "UNSUBSCRIBED";
    const statusIcon = newSubscriptionStatus ? "✅" : "❌";

    return {
      title: `📋 Subscription Status Updated - ${statusChange}`,
      body: `
A user's subscription status has been modified by an administrator.

**User Details:**
- Name: ${userName}
- Email: ${userEmail}
- User ID: ${userId}

**Subscription Change:**
- Previous Status: ${
        previousSubscriptionStatus ? "Subscribed" : "Not Subscribed"
      }
- New Status: ${statusIcon} ${statusChange}
- Updated By: ${updatedByAdmin || "Super User"}

**Impact:**
${
  newSubscriptionStatus
    ? "🎉 User now has access to premium features and subscription benefits."
    : "⚠️  User has lost access to premium features. They will retain basic functionality."
}

**Next Steps:**
${
  newSubscriptionStatus
    ? "Monitor user engagement with premium features."
    : "User may receive notification about subscription benefits if they attempt to access premium features."
}

---
System Notification from ${companyName}
Generated on: ${new Date().toLocaleString()}
    `.trim(),
    };
  }
  static subscriptionUpdateUserNotification({
    userName,
    newSubscriptionStatus,
    companyName = "raybags.com",
  }) {
    return {
      title: newSubscriptionStatus
        ? "🎉 Your Subscription Has Been Activated!"
        : "Subscription Status Update",
      body: newSubscriptionStatus
        ? `
Hi ${userName},

Great news! Your subscription has been activated by our team.

**What's Changed:**
✅ You now have access to all premium features
✅ Enhanced functionality is available in your dashboard
✅ Priority support is now included

**Get Started:**
Log in to your account to explore all the new features available to you.

If you have any questions about your subscription or need help getting started, our support team is here to assist you.

Thank you for being a valued member!

Best regards,
The ${companyName} Team
    `.trim()
        : `
Hi ${userName},

This is to inform you that your subscription status has been updated by our team.

**What's Changed:**
- Your subscription has been temporarily suspended
- You still have access to basic features
- Your account data remains safe and secure

**Questions?**
If you have any questions about this change or would like to discuss your subscription options, please don't hesitate to contact our support team.

We're here to help!

Best regards,
The ${companyName} Team
    `.trim(),
    };
  }
  static automationStartNotification({
    totalSubscribedUsers,
    totalPages,
    startTime = new Date(),
    companyName = "raybags.com",
  }) {
    return {
      title: "🚀 Auto Review Aggregation Started",
      body: `
Auto Review Aggregation Process Initiated

**Process Details:**
- Start Time: ${startTime.toLocaleString()}
- Total Subscribed Users: ${totalSubscribedUsers}
- Pages Processed: ${totalPages}
- Process ID: ${Date.now()}

**Scheduled Workers:**
📊 Group 1: Agoda, OpenTable, TripAdvisor
📊 Group 2: Booking.com, Expedia  
📊 Group 3: Google Reviews

**Expected Duration:**
Estimated completion time: 15-30 minutes (depending on data volume)

**Status:**
✅ User aggregation completed
🔄 Review workers starting...

You will receive another notification when the process completes.

---
System Automation from ${companyName}
Process Started: ${startTime.toLocaleString()}
    `.trim(),
    };
  }
  static automationCompletionNotification({
    totalSubscribedUsers,
    totalPages,
    startTime,
    endTime = new Date(),
    companyName = "raybags.com",
  }) {
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));

    return {
      title: "✅ Auto Review Aggregation Completed Successfully",
      body: `
Auto Review Aggregation Process Completed Successfully

**Process Summary:**
- Start Time: ${startTime.toLocaleString()}
- End Time: ${endTime.toLocaleString()}
- Duration: ${durationMinutes} minutes
- Total Users Processed: ${totalSubscribedUsers}
- Pages Processed: ${totalPages}

**Completed Workers:**
✅ Group 1: Agoda, OpenTable, TripAdvisor
✅ Group 2: Booking.com, Expedia
✅ Group 3: Google Reviews

**Status:**
🎉 All workers completed successfully
📊 Review data updated for all subscribed users
🔄 System ready for next scheduled run

**Next Steps:**
- Review aggregated data is now available to users
- Next automated run scheduled as per configuration
- Monitor system performance and user engagement

---
System Automation from ${companyName}
Process Completed: ${endTime.toLocaleString()}
    `.trim(),
    };
  }
  static automationErrorNotification({
    totalSubscribedUsers,
    errorMessage,
    errorPage,
    startTime,
    endTime = new Date(),
    companyName = "raybags.com",
  }) {
    return {
      title: "🚨 Auto Review Aggregation Failed",
      body: `
ALERT: Auto Review Aggregation Process Failed

**Error Details:**
- Error Time: ${endTime.toLocaleString()}
- Start Time: ${startTime.toLocaleString()}
- Error Page: ${errorPage || "Unknown"}
- Error Message: ${errorMessage}

**Process Summary:**
- Users Found: ${totalSubscribedUsers || "N/A"}
- Status: ❌ FAILED

**Immediate Actions Required:**
1. Check system logs for detailed error information
2. Verify database connectivity and external API status
3. Review worker processes for any stuck operations
4. Consider manual intervention if critical

**Impact:**
⚠️  Review data may not be updated for subscribed users
⚠️  Users may experience stale data until next successful run

Please investigate and resolve the issue promptly.

---
System Alert from ${companyName}
Error Occurred: ${endTime.toLocaleString()}
    `.trim(),
    };
  }
}
