import "dotenv/config";
import { sendNotificationEmail } from "../../middleware/emailer.js";
import { GetAllUsersController } from "../controllers/userController.js";
import EmailTemplates from "../data/email/emailTemplates.js";
import { logger } from "../loggers/logger.js";
import agodaWorker from "./subArgents/agodaSubArgent/agodaWorker.js";
import bookingWorker from "./subArgents/bookingSubArgent/bookingWorker.js";
import expediaWorker from "./subArgents/expediaSubArgent/expediaWorker.js";
import googleWorker from "./subArgents/googleSubArgent/googleWorker.js";
import opentableWorker from "./subArgents/opentableSubArgent/opentableWorker.js";
import tripeWorker from "./subArgents/tripSubArgent/tripWorker.js";

const { RECIPIENT_EMAIL } = process.env;

/**
 * Aggregates all subscribed users and runs various workers to process reviews.
 * This function fetches all subscribed users in a paginated manner and then
 * invokes different worker functions to handle reviews for each user.
 *
 * @returns {Promise<void>}
 */

export default async function runAutoReviewAggregator() {
  const startTime = new Date();
  try {
    const userItemsPerPage = 10;
    let page = 1;
    let allSubscribedUsers = [];
    let hasMorePages = true;

    while (hasMorePages) {
      try {
        const paginatedReq = { query: { page } };

        const users = await GetAllUsersController(paginatedReq, null, false);

        if (!users) {
          logger(`No users returned on page ${page}. Exiting.`, "warn");
          break;
        }

        if (users.length === 0 || users.length < userItemsPerPage) {
          hasMorePages = false;
        }

        const subscribedUsers = users.filter((user) => user.isSubscribed);
        allSubscribedUsers.push(...subscribedUsers);

        logger(
          `Processed page ${page}, found ${users?.length || 0} users`,
          "info"
        );
        page++;
      } catch (pageError) {
        logger(`Fatal error on page ${page}: ${pageError.message}`, "error");

        const errorEmailData = EmailTemplates.automationErrorNotification({
          totalSubscribedUsers: allSubscribedUsers.length,
          errorMessage: pageError.message,
          errorPage: page,
          startTime,
        });
        await sendNotificationEmail(errorEmailData, RECIPIENT_EMAIL);
        break;
      }
    }
    const totalPages = page - 1;

    const startEmailData = EmailTemplates.automationStartNotification({
      totalSubscribedUsers: allSubscribedUsers.length,
      totalPages,
      startTime,
    });
    await sendNotificationEmail(startEmailData, RECIPIENT_EMAIL);

    logger(
      `Completed aggregation. Found ${
        allSubscribedUsers.length
      } subscribed users across ${page - 1} pages`,
      "info"
    );

    if (!allSubscribedUsers)
      return logger("No subscribed users to process", "warn");

    // === GROUP 1: agoda && opentable && trip ===
    await Promise.all([
      agodaWorker(allSubscribedUsers, undefined, true),
      opentableWorker(allSubscribedUsers, undefined, true),
      tripeWorker(allSubscribedUsers, undefined, true),
    ]);

    // === GROUP 2: booking && expedia ===
    await Promise.all([
      bookingWorker(allSubscribedUsers, undefined, true),
      expediaWorker(allSubscribedUsers, undefined, true),
    ]);

    // === GROUP 3: google ===
    await googleWorker(allSubscribedUsers, undefined, true);

    logger("All workers completed successfully", "info");

    const completionEmailData = EmailTemplates.automationCompletionNotification(
      {
        totalSubscribedUsers: allSubscribedUsers.length,
        totalPages,
        startTime,
        endTime: new Date(),
      }
    );
    await sendNotificationEmail(completionEmailData, RECIPIENT_EMAIL);
  } catch (err) {
    logger(`runAutoReviewAggregator error: ${err.message}`, "error");
    const errorEmailData = EmailTemplates.automationErrorNotification({
      totalSubscribedUsers: allSubscribedUsers.length,
      errorMessage: err.message,
      startTime,
    });
    await sendNotificationEmail(errorEmailData, RECIPIENT_EMAIL);
  }
}
