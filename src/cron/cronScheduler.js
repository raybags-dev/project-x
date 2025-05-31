import scheduleAutomationTask, {
  cleanupJobHistory,
  getCronScheduleStrings,
  getJobStats,
} from "../../middleware/cronUtility.js";

import { logger } from "../loggers/logger.js";

/**
 * Sets up all cron jobs with conflict prevention and intelligent scheduling
 *
 * @param {Object} config - Configuration object
 * @param {Function} config.taskFunction - The main task function to run
 * @param {boolean} config.runAutomation - Whether to enable automation
 * @param {string} config.instanceId - Instance identifier for logging
 * @param {Object} config.schedules - Custom schedule overrides (optional)
 * @param {Object} config.jobOptions - Global job options (optional)
 * @param {boolean} config.enableMonitoring - Enable job monitoring (optional)
 */
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

  if (!runAutomation) {
    logger(`Skipping cron jobs setup for instance ${instanceId}`);
    return {
      success: false,
      message: "Automation disabled",
      scheduledJobs: [],
    };
  }

  logger(`Setting up cron jobs on instance ${instanceId}`);

  const CRON_SCHEDULES = getCronScheduleStrings();
  const scheduledJobs = [];

  // Merge custom schedules with defaults
  const finalSchedules = {
    every8Hours: CRON_SCHEDULES.every8Hours,
    everyDayOffset: CRON_SCHEDULES.everyDayOffset,
    every1month: CRON_SCHEDULES.every1month,
    every6months: CRON_SCHEDULES.every6months,
    ...schedules,
  };

  // Default job configurations with conflict prevention
  const jobConfigs = [
    {
      name: "reviewAggregator8h",
      schedule: finalSchedules.every8Hours,
      options: {
        gracePeriodMinutes: 30,
        skipIfRecentRun: true,
        recentRunThresholdMinutes: 60,
        maxRetries: 2,
        ...jobOptions.every8Hours,
      },
    },
    {
      name: "reviewAggregatorDaily",
      schedule: finalSchedules.everyDayOffset,
      options: {
        gracePeriodMinutes: 45,
        skipIfRecentRun: true,
        recentRunThresholdMinutes: 480, // 8 hours
        maxRetries: 3,
        ...jobOptions.daily,
      },
    },
    {
      name: "reviewAggregatorMonthly",
      schedule: finalSchedules.every1month,
      options: {
        gracePeriodMinutes: 60,
        skipIfRecentRun: true,
        recentRunThresholdMinutes: 1440, // 24 hours
        maxRetries: 3,
        ...jobOptions.monthly,
      },
    },
    {
      name: "reviewAggregator6Monthly",
      schedule: finalSchedules.every6months,
      options: {
        gracePeriodMinutes: 120,
        skipIfRecentRun: true,
        recentRunThresholdMinutes: 2880, // 48 hours
        maxRetries: 5,
        ...jobOptions.sixMonthly,
      },
    },
  ];

  // Schedule all jobs
  try {
    jobConfigs.forEach(({ name, schedule, options }) => {
      scheduleAutomationTask(taskFunction, schedule, name, true, options);

      scheduledJobs.push({
        name,
        schedule,
        options,
      });

      logger(`✓ Scheduled ${name} with cron: ${schedule}`);
    });

    // Schedule cleanup job
    scheduleAutomationTask(
      () => cleanupJobHistory(7),
      "0 2 * * 0", // Every Sunday at 2 AM
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
      schedule: "0 2 * * 0",
      options: { gracePeriodMinutes: 10 },
    });

    logger(`✓ All ${scheduledJobs.length} cron jobs scheduled...`);

    // Optional monitoring setup
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
  logger("\n[JOB HEALTH REPORT]");

  if (stats.allHistory.length === 0) {
    logger("No job history available yet.");
    return;
  }

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
