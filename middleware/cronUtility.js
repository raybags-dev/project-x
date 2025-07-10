import cron from "node-cron";
import { logger } from "../src/loggers/logger.js";

const jobLocks = new Map();
const jobHistory = new Map();

export default function scheduleAutomationTask(
  taskFn,
  cronExpression,
  jobName = "unnamed",
  run_automation = true,
  options = {}
) {
  if (!run_automation) {
    logger(
      "cron triggers for auto-extraction disabled. Task will not run.",
      "info"
    );
    return;
  }

  if (typeof taskFn !== "function") {
    logger("Invalid task function provided to scheduler", "error");
    return;
  }

  const {
    gracePeriodMinutes = 30,
    skipIfRecentRun = true,
    recentRunThresholdMinutes = 60,
    maxRetries = 3,
    retryDelayMs = 5000,
  } = options;

  const jobId = `${jobName}_${cronExpression}`;

  const job = cron.schedule(cronExpression, async () => {
    try {
      if (isJobRunning(jobId)) {
        logger(
          `Job ${jobName} is already running. Skipping this execution.`,
          "warn"
        );
        return;
      }

      if (skipIfRecentRun && hasRecentRun(jobId, recentRunThresholdMinutes)) {
        logger(
          `Job ${jobName} ran recently (within ${recentRunThresholdMinutes}min). Skipping execution.`,
          "info"
        );
        return false;
      }

      if (hasConflictingJobs(jobId, gracePeriodMinutes)) {
        logger(
          `Conflicting job detected for ${jobName}. Waiting for grace period...`,
          "warn"
        );

        await new Promise((resolve) =>
          setTimeout(resolve, gracePeriodMinutes * 60 * 1000)
        );

        if (isJobRunning(jobId) || hasConflictingJobs(jobId, 0)) {
          logger(
            `Job ${jobName} still conflicts after grace period. Skipping execution.`,
            "warn"
          );
          return;
        }
      }

      await executeJobWithRetry(
        taskFn,
        jobId,
        jobName,
        maxRetries,
        retryDelayMs
      );
    } catch (err) {
      logger(
        `Scheduled automation task ${jobName} failed: ${err.message}`,
        "error"
      );
    }
  });

  logger(`Scheduled task '${jobName}' with cron: '${cronExpression}'`, "info");
  return job;
}
async function executeJobWithRetry(
  taskFn,
  jobId,
  jobName,
  maxRetries,
  retryDelayMs
) {
  let attempts = 0;

  while (attempts <= maxRetries) {
    try {
      // Acquire lock
      acquireJobLock(jobId);
      logger(
        `Starting scheduled automation task: ${jobName} (attempt ${
          attempts + 1
        })`,
        "info"
      );

      const startTime = Date.now();
      await taskFn();
      const duration = Date.now() - startTime;

      recordJobExecution(jobId, true, duration);
      logger(
        `Scheduled automation task ${jobName} completed successfully in ${duration}ms`,
        "info"
      );

      return;
    } catch (err) {
      attempts++;
      logger(
        `Scheduled automation task ${jobName} failed (attempt ${attempts}): ${err.message}`,
        "error"
      );

      if (attempts <= maxRetries) {
        logger(`Retrying ${jobName} in ${retryDelayMs}ms...`, "info");
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      } else {
        recordJobExecution(jobId, false, 0, err.message);
        logger(`Job ${jobName} failed after ${maxRetries} attempts`, "error");
      }
    } finally {
      releaseJobLock(jobId);
    }
  }
}
function isJobRunning(jobId) {
  return jobLocks.has(jobId) && jobLocks.get(jobId).isRunning;
}
function hasRecentRun(jobId, thresholdMinutes) {
  const history = jobHistory.get(jobId);
  if (!history || !history.lastSuccessful) {
    return false;
  }
  const timeDiff = Date.now() - history.lastSuccessful;
  const minutesDiff = timeDiff / (1000 * 60);

  return minutesDiff < thresholdMinutes;
}
function hasConflictingJobs(currentJobId, gracePeriodMinutes) {
  const now = Date.now();

  for (const [jobId, lockInfo] of jobLocks.entries()) {
    if (jobId === currentJobId) continue;

    if (lockInfo.isRunning) {
      // Check if the running job started within grace period
      const timeDiff = now - lockInfo.startTime;
      const minutesDiff = timeDiff / (1000 * 60);

      if (minutesDiff < gracePeriodMinutes) {
        return true;
      }
    }
  }

  return false;
}
function acquireJobLock(jobId) {
  jobLocks.set(jobId, {
    isRunning: true,
    startTime: Date.now(),
    pid: process.pid,
  });
}
function releaseJobLock(jobId) {
  if (jobLocks.has(jobId)) {
    jobLocks.delete(jobId);
  }
}
function recordJobExecution(jobId, success, duration, error = null) {
  const now = Date.now();
  const history = jobHistory.get(jobId) || {
    totalRuns: 0,
    successfulRuns: 0,
    failedRuns: 0,
    lastRun: null,
    lastSuccessful: null,
    lastFailed: null,
    averageDuration: 0,
  };

  history.totalRuns++;
  history.lastRun = now;

  if (success) {
    history.successfulRuns++;
    history.lastSuccessful = now;
    history.averageDuration =
      history.averageDuration === 0
        ? duration
        : (history.averageDuration + duration) / 2;
  } else {
    history.failedRuns++;
    history.lastFailed = now;
    history.lastError = error;
  }

  jobHistory.set(jobId, history);
}
export function getJobStats(jobId = null) {
  if (jobId) {
    return {
      locks: jobLocks.get(jobId),
      history: jobHistory.get(jobId),
    };
  }
  return {
    activeLocks: Array.from(jobLocks.entries()),
    allHistory: Array.from(jobHistory.entries()),
  };
}
export function cleanupJobHistory(olderThanDays = 7) {
  const cutoff = Date.now() - olderThanDays * 24 * 60 * 60 * 1000;

  for (const [jobId, history] of jobHistory.entries()) {
    if (history.lastRun && history.lastRun < cutoff) {
      jobHistory.delete(jobId);
      logger(`Cleaned up old history for job: ${jobId}`, "info");
    }
  }
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
    every6Hours: "0 */6 * * *", // At minute 0 past every 6th hour
    every8Hours: "0 */8 * * *", // At minute 0 past every 8th hour (0:00, 8:00, 16:00)
    every12Hours: "0 */12 * * *", // At minute 0 past every 12th hour
    everyDayOffset: "15 0 * * *", // At 00:15 (15 minutes after midnight)
    everyDay: "0 0 * * *", // At 00:00 (midnight) every day
    every1month: "15 0 1 * *", // At 00:15 on the 1st of every month
    every6months: "30 0 1 */6 *", // At 00:30 on the 1st of every 6th month
    everyYear: "45 0 1 1 *", // At 00:45 on the 1st of January every year
  };
}
