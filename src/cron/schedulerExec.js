import { authMiddleware } from "../../middleware/auth.js";
import isSubscribed, { userIsSuper } from "../../middleware/generalUtils.js";
import { generateUniqueId } from "../../middleware/uuidGenerator.js";
import { logger } from "../loggers/logger.js";
import {
  getCurrentJobStatus,
  setupCronJobs,
  triggerHistoryCleanup,
} from "./cronScheduler.js";

/**
 * Main scheduler runner
 * @param {Object} options - Configuration options
 * @param {Function} options.taskFunction - The main task function to execute
 * @param {boolean} options.runAutomation - Whether automation is enabled
 * @param {string} options.instanceId - Instance identifier
 * @param {Object} options.app - Express app instance for setting up endpoints
 * @param {Object} options.schedules - Custom cron schedules (optional)
 * @param {Object} options.jobOptions - Custom job configuration (optional)
 * @param {boolean} options.enableMonitoring - Enable monitoring endpoints (optional)
 * @param {boolean} options.enableEndpoints - Enable REST endpoints for job control (optional)
 * @param {Object} options.endpointOptions - Endpoint configuration (optional)
 */

function parseDaysParam(req, fallback = 7) {
  const raw = req.body?.days;
  const parsed = parseInt(raw, 10);

  if (isNaN(parsed)) return { valid: true, value: fallback };

  if (parsed < 1 || parsed > 365) {
    return {
      valid: false,
      error: "Days must be between 1 and 365",
    };
  }

  return { valid: true, value: parsed };
}
export function runScheduler({
  taskFunction,
  runAutomation = false,
  instanceId = "unknown",
  app = null,
  schedules = {},
  jobOptions = {},
  enableMonitoring = true,
  enableEndpoints = true,
  endpointOptions = {},
}) {
  if (!taskFunction || typeof taskFunction !== "function") {
    throw new Error("taskFunction is required and must be a function");
  }

  if (!runAutomation) {
    console.log(`Skipping cron jobs setup for instance ${instanceId}`);
    return {
      success: false,
      message: "Automation disabled",
      instanceId,
      scheduledJobs: [],
    };
  }

  console.log(`Setting up automation scheduler for instance ${instanceId}`);

  try {
    // Default schedules with conflict prevention
    const defaultSchedules = {
      every8Hours: "0 */8 * * *", // Keep default: 00:00, 08:00, 16:00
      everyDayOffset: "30 0 * * *", // Run at 00:30 instead of 00:15
      every1month: "0 1 1 * *", // Run at 01:00 on 1st of month
      every6months: "0 2 1 */6 *", // Run at 02:00 on 1st of every 6th month
    };

    // Default job options with intelligent conflict prevention
    const defaultJobOptions = {
      every8Hours: {
        gracePeriodMinutes: 45,
        maxRetries: 3,
      },
      daily: {
        recentRunThresholdMinutes: 360,
        maxRetries: 2,
      },
      monthly: {
        gracePeriodMinutes: 90,
        maxRetries: 5,
      },
      sixMonthly: {
        gracePeriodMinutes: 180,
        maxRetries: 7,
      },
    };

    // Merge user options with defaults
    const finalSchedules = { ...defaultSchedules, ...schedules };
    const finalJobOptions = {
      every8Hours: {
        ...defaultJobOptions.every8Hours,
        ...jobOptions.every8Hours,
      },
      daily: { ...defaultJobOptions.daily, ...jobOptions.daily },
      monthly: { ...defaultJobOptions.monthly, ...jobOptions.monthly },
      sixMonthly: { ...defaultJobOptions.sixMonthly, ...jobOptions.sixMonthly },
    };

    // Setup cron jobs
    const result = setupCronJobs({
      taskFunction,
      runAutomation,
      instanceId,
      schedules: finalSchedules,
      jobOptions: finalJobOptions,
      enableMonitoring,
    });

    if (!result.success) {
      console.error(`❌ Scheduler setup failed: ${result.message}`);
      return result;
    }

    console.log(`✅ ${result.message}`);
    console.log(`Cron jobs setup result:`, JSON.stringify(result));
    if (app && enableEndpoints) {
      setupMonitoringEndpoints(app, instanceId, endpointOptions);
      console.log(`✅ Monitoring endpoints enabled for instance ${instanceId}`);
    }

    return {
      ...result,
      endpointsEnabled: !!(app && enableEndpoints),
    };
  } catch (error) {
    console.error(
      `❌ Scheduler setup failed for instance ${instanceId}:`,
      error
    );
    return {
      success: false,
      message: error.message,
      instanceId,
      scheduledJobs: [],
      error,
    };
  }
}
export function setupMonitoringEndpoints(app, instanceId, options = {}) {
  const {
    basePath = "",
    requireAuth = false,
    authMiddleware = null,
    enableJobStatus = true,
    enableCleanup = true,
    enableJobControl = false,
  } = options;

  const normalizedMiddleware = authMiddleware
    ? Array.isArray(authMiddleware)
      ? authMiddleware
      : [authMiddleware]
    : [];

  if (requireAuth) {
    if (normalizedMiddleware.length === 0) {
      return logger(
        "Authentication middleware is required when requireAuth is true, and it must be a non-empty array of functions",
        "error"
      );
    }

    if (!normalizedMiddleware.every((fn) => typeof fn === "function")) {
      return logger("All items in authMiddleware must be functions", "error");
    }
  }
  if (enableJobStatus) {
    app.post(`${basePath}/job-status`, normalizedMiddleware, (req, res) => {
      try {
        const token = generateUniqueId(1000);
        const status = getCurrentJobStatus();
        res.set("Content-Type", "application/json");
        res.set("X-SessionToken", `${token}`);

        res.status(200).json({
          success: true,
          instanceId,
          SessionToken: token,
          timestamp: new Date().toISOString(),
          ...status,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          instanceId,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }
  if (enableCleanup) {
    app.post(
      `${basePath}/cleanup-history`,
      normalizedMiddleware,
      (req, res) => {
        try {
          const token = generateUniqueId(1000);
          const { valid, value, error } = parseDaysParam(req);

          if (!valid) {
            return res.status(400).json({
              success: false,
              error,
              instanceId,
            });
          }

          triggerHistoryCleanup(value);
          res.set("Content-Type", "application/json");
          res.set("X-SessionToken", `${token}`);
          res.status(200).json({
            success: true,
            message: `Cleanup triggered for jobs older than ${value} days`,
            instanceId,
            SessionToken: token,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          res.status(500).json({
            success: false,
            error: error.message,
            instanceId,
            timestamp: new Date().toISOString(),
          });
        }
      }
    );
  }
  if (enableJobControl) {
    app.post(
      `${basePath}/scheduler-health`,
      normalizedMiddleware,
      (req, res) => {
        try {
          const status = getCurrentJobStatus();
          const token = generateUniqueId(1000);
          const isHealthy = status.activeLocks.length < 5; // health threshold

          res.set("Content-Type", "application/json");
          res.set("X-SessionToken", `${token}`);
          res.status(isHealthy ? 200 : 503).json({
            success: true,
            healthy: isHealthy,
            instanceId,
            SessionToken: token,
            activeJobs: status.activeLocks.length,
            timestamp: new Date().toISOString(),
          });
        } catch (error) {
          res.status(503).json({
            success: false,
            healthy: false,
            error: error.message,
            instanceId,
            timestamp: new Date().toISOString(),
          });
        }
      }
    );
    app.post(`${basePath}/job-stats`, normalizedMiddleware, (req, res) => {
      try {
        const stats = getCurrentJobStatus();
        const token = generateUniqueId(1000);

        // Calculate aggregate statistics
        const aggregateStats = {
          totalJobs: stats.allHistory.length,
          totalRuns: 0,
          totalSuccessful: 0,
          totalFailed: 0,
          averageSuccessRate: 0,
        };

        stats.allHistory.forEach(([jobId, history]) => {
          aggregateStats.totalRuns += history.totalRuns;
          aggregateStats.totalSuccessful += history.successfulRuns;
          aggregateStats.totalFailed += history.failedRuns;
        });

        if (aggregateStats.totalRuns > 0) {
          aggregateStats.averageSuccessRate = Math.round(
            (aggregateStats.totalSuccessful / aggregateStats.totalRuns) * 100
          );
        }

        res.set("Content-Type", "application/json");
        res.set("X-SessionToken", `${token}`);
        res.json({
          success: true,
          instanceId,
          SessionToken: token,
          timestamp: new Date().toISOString(),
          aggregate: aggregateStats,
          individual: stats.allHistory,
        });
      } catch (error) {
        res.status(500).json({
          success: false,
          error: error.message,
          instanceId,
          timestamp: new Date().toISOString(),
        });
      }
    });
  }
}
export function getDefaultSchedulerConfig() {
  return {
    schedules: {
      every8Hours: "0 */8 * * *",
      everyDayOffset: "30 0 * * *",
      every1month: "0 1 1 * *",
      every6months: "0 2 1 */6 *",
    },
    jobOptions: {
      every8Hours: {
        gracePeriodMinutes: 45,
        maxRetries: 3,
      },
      daily: {
        recentRunThresholdMinutes: 360,
        maxRetries: 2,
      },
      monthly: {
        gracePeriodMinutes: 90,
        maxRetries: 5,
      },
      sixMonthly: {
        gracePeriodMinutes: 180,
        maxRetries: 7,
      },
    },
    enableMonitoring: true,
    enableEndpoints: true,
    endpointOptions: {
      basePath: "/raybags/v1/review-crawler/scheduler",
      requireAuth: true,
      enableJobStatus: true,
      enableCleanup: true,
      enableJobControl: true,
      authMiddleware: [authMiddleware, userIsSuper, isSubscribed],
    },
  };
}
