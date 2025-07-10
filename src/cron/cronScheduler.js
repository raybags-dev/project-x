import scheduleAutomationTask, {
  cleanupJobHistory,
  getJobStats,
} from "../../middleware/cronUtility.js";

import { logger } from "../loggers/logger.js";

export function setupCronJobs({
  taskFunction,
  runAutomation = true,
  instanceId = "unknown",
  schedules = {},
  jobOptions = {},
  enableMonitoring = false,
}) {
  if (!taskFunction || typeof taskFunction !== "function") {
    throw new Error("taskFunction is required and must be a function");
  }

  const isTestMode = process.env.TEST_MODE === "true";

  if (!runAutomation) {
    logger(`Skipping cron jobs setup for instance ${instanceId}`);
    return {
      success: false,
      message: "Automation disabled",
      scheduledJobs: [],
    };
  }

  logger(`Setting up cron jobs on instance ${instanceId}`);

  const finalSchedules = { ...schedules };
  const scheduledJobs = [];

  const jobConfigs = [];

  if (finalSchedules.every8Hours) {
    jobConfigs.push({
      name: "reviewAggregator8h",
      key: "every8Hours",
      schedule: finalSchedules.every8Hours,
      options: {
        gracePeriodMinutes: 30,
        skipIfRecentRun: true,
        recentRunThresholdMinutes: 60,
        maxRetries: 2,
        ...jobOptions.every8Hours,
      },
    });
  }

  if (finalSchedules.everyDayOffset) {
    jobConfigs.push({
      name: "reviewAggregatorDaily",
      key: "everyDayOffset",
      schedule: finalSchedules.everyDayOffset,
      options: {
        gracePeriodMinutes: 45,
        skipIfRecentRun: true,
        recentRunThresholdMinutes: 480,
        maxRetries: 3,
        ...jobOptions.daily,
      },
    });
  }

  if (finalSchedules.every1month) {
    jobConfigs.push({
      name: "reviewAggregatorMonthly",
      key: "every1month",
      schedule: finalSchedules.every1month,
      options: {
        gracePeriodMinutes: 60,
        skipIfRecentRun: true,
        recentRunThresholdMinutes: 1440,
        maxRetries: 3,
        ...jobOptions.monthly,
      },
    });
  }

  if (finalSchedules.every6months) {
    jobConfigs.push({
      name: "reviewAggregator6Monthly",
      key: "every6months",
      schedule: finalSchedules.every6months,
      options: {
        gracePeriodMinutes: 120,
        skipIfRecentRun: true,
        recentRunThresholdMinutes: 2880,
        maxRetries: 5,
        ...jobOptions.sixMonthly,
      },
    });
  }

  if (isTestMode && finalSchedules.every5Minutes) {
    jobConfigs.push({
      name: "reviewAggregatorTestJob",
      key: "every5Minutes",
      schedule: finalSchedules.every5Minutes,
      options: {
        gracePeriodMinutes: 2,
        skipIfRecentRun: false,
        maxRetries: 1,
        ...jobOptions.every5Minutes,
      },
    });
  }

  try {
    jobConfigs.forEach(({ name, key, options }) => {
      const schedule = finalSchedules[key];
      if (!schedule) {
        logger(`Skipping job ${name} because schedule is not defined`, "info");
        return;
      }

      scheduleAutomationTask(taskFunction, schedule, name, true, options);

      scheduledJobs.push({
        name,
        schedule,
        options,
      });

      logger(`✓ Scheduled ${name} with cron: ${schedule}`);
    });

    // Schedule cleanup job
    const cleanupSchedule = "0 2 * * 0"; // Every Sunday at 2 AM

    if (!process.env.TEST_MODE) {
      scheduleAutomationTask(
        () => cleanupJobHistory(7),
        cleanupSchedule,
        "historyCleanup",
        true,
        {
          gracePeriodMinutes: 10,
          skipIfRecentRun: false,
          maxRetries: 1,
        }
      );

      scheduledJobs.push({
        name: "historyCleanup",
        schedule: cleanupSchedule,
        options: { gracePeriodMinutes: 10 },
      });
    }

    if (process.env.TEST_MODE === "true") {
      const expected = 1;
      const actual = scheduledJobs.length;

      logger(
        actual === expected
          ? `🧪 [TEST_MODE] ✓ ${actual} test job scheduled for instance ${instanceId}`
          : `🧪 [TEST_MODE] ⚠ Expected ${expected} test job, but found ${actual}`
      );
    }

    if (enableMonitoring) {
      setupJobMonitoring();
    }

    return {
      success: true,
      message: `Successfully scheduled ${scheduledJobs.length} jobs`,
      scheduledJobs,
      instanceId,
    };
  } catch (error) {
    logger(
      `Failed to setup cron jobs for instance ${instanceId}: ${error}`,
      "error"
    );
    return {
      success: false,
      message: error.message,
      scheduledJobs: [],
      error,
    };
  }
}
function setupJobMonitoring() {
  const monitoringInterval = setInterval(() => {
    const stats = getJobStats();

    if (stats.activeLocks.length > 0) {
      logger(`[MONITOR] Active jobs: ${stats.activeLocks.length}`);
      stats.activeLocks.forEach(([jobId, lockInfo]) => {
        const runtime = Math.round((Date.now() - lockInfo.startTime) / 1000);
        logger(`  - ${jobId}: running for ${runtime}s`);
      });
    }

    const now = Date.now();
    if (
      !setupJobMonitoring.lastHealthCheck ||
      now - setupJobMonitoring.lastHealthCheck > 30 * 60 * 1000
    ) {
      logJobHealth();
      setupJobMonitoring.lastHealthCheck = now;
    }
  }, 60000);

  process.on("SIGINT", () => {
    clearInterval(monitoringInterval);
  });

  process.on("SIGTERM", () => {
    clearInterval(monitoringInterval);
  });
}
function logJobHealth() {
  const stats = getJobStats();
  logger("[JOB HEALTH REPORT]");

  if (stats.allHistory.length === 0)
    return logger("No job history available yet.");

  stats.allHistory.forEach(([jobId, history]) => {
    const successRate =
      history.totalRuns > 0
        ? Math.round((history.successfulRuns / history.totalRuns) * 100)
        : 0;

    const avgDuration =
      history.averageDuration > 0
        ? Math.round(history.averageDuration / 1000)
        : 0;

    logger(`  ${jobId}:`);
    logger(
      `    Success Rate: ${successRate}% (${history.successfulRuns}/${history.totalRuns})`
    );
    logger(`    Avg Duration: ${avgDuration}s`);

    if (history.lastSuccessful) {
      const lastRun = new Date(history.lastSuccessful).toLocaleString();
      logger(`    Last Success: ${lastRun}`);
    }

    if (history.lastFailed && history.lastError) {
      logger(`    Last Error: ${history.lastError}`);
    }
  });
  logger("\n");
}
export function getCurrentJobStatus() {
  return getJobStats();
}
export function triggerHistoryCleanup(olderThanDays = 7) {
  return cleanupJobHistory(olderThanDays);
}
