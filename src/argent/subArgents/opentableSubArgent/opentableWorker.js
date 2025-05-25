import { getAllSubscribedUsers } from "../../../controllers/userUtils.js";
import { logger } from "../../../loggers/logger.js";
import { generateOpentableReviews } from "../../../ochestrators/opentableOche.js";

export default async function opentableWorker(
  options = null,
  concurrencyLimit = 5,
  shouldRun = true
) {
  if (!shouldRun)
    return logger("opentable worker is disabled. Exiting.", "info");

  logger("Starting opentableWorker...", "info");
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

      const opentableResult = await generateOpentableReviews(null, null, user);
      return { userId: user.userId, opentable: opentableResult };
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
