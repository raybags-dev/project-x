import { GetAllUsersController } from "../controllers/userController.js";
import { logger } from "../loggers/logger.js";
import agodaWorker from "./subArgents/agodaSubArgent/agodaWorker.js";
import bookingWorker from "./subArgents/bookingSubArgent/bookingWorker.js";
import expediaWorker from "./subArgents/expediaSubArgent/expediaWorker.js";
import opentableWorker from "./subArgents/opentableSubArgent/opentableWorker.js";
import tripeWorker from "./subArgents/tripSubArgent/tripWorker.js";

export default async function runAutoReviewAggregator() {
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
        break;
      }
    }

    logger(
      `Completed aggregation. Found ${
        allSubscribedUsers.length
      } subscribed users across ${page - 1} pages`,
      "info"
    );

    if (!allSubscribedUsers)
      return logger("No subscribed users to process", "warn");

    //*======== BOOKING WORKER ========= */
    await bookingWorker(allSubscribedUsers, undefined, true);
    //*======== AGODA WORKER ========= */
    await agodaWorker(allSubscribedUsers, undefined, true);
    //*======== EXPEDIA WORKER ========= */
    await expediaWorker(allSubscribedUsers, undefined, true);
    //*======== OPENTABLE WORKER ========= */
    await opentableWorker(allSubscribedUsers, undefined, true);
    //*======== TRIP WORKER ========= */
    await tripeWorker(allSubscribedUsers, undefined, true);
  } catch (err) {
    logger(`runAutoReviewAggregator error: ${err.message}`, "error");
  }
}
