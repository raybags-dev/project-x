import { getAllSubscribedUsers } from "../../../controllers/userUtils.js";
import { logger } from "../../../loggers/logger.js";
import { generateExpediaReviews } from "../../../ochestrators/expediaOche.js";

export default async function expediaWorker(
  options = null,
  concurrencyLimit = 5,
  shouldRun = true
) {
  if (!shouldRun) return logger("expedia worker is disabled. Exiting.", "info");

  logger("Starting expediaWorker...", "info");
  const users =
    options && options.length
      ? options.filter((user) => user.isSubscribed === true)
      : (await getAllSubscribedUsers()).users;

  if (!users.length) throw new Error("No subscribed users found.");

  const results = [];

  const processUser = async (user) => {
    try {
      if (!user) {
        logger(`User profile <${user?.userId}> is invalid`, "error");
        return null;
      }

      const expediaResult = await generateExpediaReviews(null, null, user);
      return { userId: user.userId, expedia: expediaResult };
    } catch (error) {
      logger(
        `Error processing user <${user?.userId}>: ${error.message}`,
        "error"
      );
      return { userId: user?.userId, error: error.message };
    }
  };

  for (let i = 0; i < users.length; i += concurrencyLimit) {
    const batch = users.slice(i, i + concurrencyLimit);
    logger(`Processing users ${i + 1} to ${i + batch.length}`, "info");

    const batchResults = await Promise.all(batch.map(processUser));
    results.push(...batchResults.filter(Boolean));
  }

  logger(`Finished processing ${results.length} users`, "info");
  return results;
}
