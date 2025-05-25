import cron from "node-cron";
import { logger } from "../src/loggers/logger.js";

/**
 * Schedules a task to run on a cron expression if automation is enabled.
 *
 * @param {Function} taskFn - The async function to run.
 * @param {string} cronExpression - The cron schedule string.
 * @param {boolean} run_automation - If false, the task will not run.
 */
export default function scheduleAutomationTask(
  taskFn,
  cronExpression,
  run_automation = true
) {
  if (!run_automation) {
    logger(
      "cron tiggers for auto-extraction disabled. Task will not run.",
      "info"
    );
    return;
  }

  if (typeof taskFn !== "function") {
    logger("Invalid task function provided to scheduler", "error");
    return;
  }

  cron.schedule(cronExpression, async () => {
    try {
      logger("Starting scheduled automation task...", "info");
      await taskFn();
      logger("Scheduled automation task completed successfully.", "info");
    } catch (err) {
      logger(`Scheduled automation task failed: ${err.message}`, "error");
    }
  });

  logger(`Scheduled task with cron: '${cronExpression}'`, "info");
}
export function getCronScheduleStrings() {
  return {
    everyMinute: "* * * * *", // Every minute for testing purposes
    every5Minutes: "*/5 * * * *", // Every 5 minutes
    every10Minutes: "*/10 * * * *", // Every 10 minutes
    every15Minutes: "*/15 * * * *", // Every 15 minutes
    every30Minutes: "*/30 * * * *", // Every 30 minutes
    everyHour: "0 * * * *", // At minute 0 of every hour
    every2Hours: "0 */2 * * *", // At minute 0 past every 2nd hour
    every3Hours: "0 */3 * * *", // At minute 0 past every 3rd hour
    every4Hours: "0 */4 * * *", // At minute 0 past every 4th hour
    every12Hours: "0 */12 * * *", // At minute 0 past every 12th hour
    everyDay: "0 0 * * *", // At 00:00 (midnight) every day
    every8hrs: "0 */8 * * *", // At minute 0 past every 8th hour
    every6hrs: "0 */6 * * *", // At minute 0 past every 6th hour
    every1month: "0 0 1 * *", // At 00:00 on the 1st of every month
    every6months: "0 0 1 */6 *", // At 00:00 on the 1st of every 6th month
    everyYear: "0 0 1 1 *", // At 00:00 on the 1st of January every year
  };
}
