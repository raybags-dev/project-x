import express from "express";
import cron from "node-cron";
import request from "supertest";
import { triggerHistoryCleanup } from "../../src/cron/cronScheduler.js";
import { setupMonitoringEndpoints } from "../../src/cron/schedulerExec.js";
import { logger } from "../../src/loggers/logger.js";

import {
  getCronScheduleStrings,
  getJobStats,
  default as scheduleAutomationTask,
} from "../../middleware/cronUtility.js";

// Mock cron
jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

// Mock logger
jest.mock("../../src/loggers/logger.js", () => ({
  logger: jest.fn(),
}));

// Mock internal job functions
jest.mock("../../src/cron/cronScheduler.js", () => ({
  getCurrentJobStatus: jest.fn(() => ({
    activeLocks: [],
    allHistory: [["jobA", { totalRuns: 10, successfulRuns: 9, failedRuns: 1 }]],
  })),
  triggerHistoryCleanup: jest.fn(),
}));

describe("Scheduler Utilities", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe("scheduleAutomationTask", () => {
    it("should skip scheduling if run_automation is false", () => {
      scheduleAutomationTask(() => {}, "* * * * *", "test-job", false);
      expect(logger).toHaveBeenCalledWith(
        "cron triggers for auto-extraction disabled. Task will not run.",
        "info"
      );
      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it("should log error if taskFn is not a function", () => {
      scheduleAutomationTask(null, "* * * * *", "test-job", true);
      expect(logger).toHaveBeenCalledWith(
        "Invalid task function provided to scheduler",
        "error"
      );
      expect(cron.schedule).not.toHaveBeenCalled();
    });

    it("should schedule the task correctly", () => {
      const taskFn = jest.fn();
      scheduleAutomationTask(taskFn, "* * * * *", "test-job");
      expect(cron.schedule).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Function)
      );
      expect(logger).toHaveBeenCalledWith(
        "Scheduled task 'test-job' with cron: '* * * * *'",
        "info"
      );
    });

    it("should execute taskFn and update job stats", async () => {
      const taskFn = jest.fn().mockResolvedValue();
      const cronHandler = jest.fn((_, cb) => cb());
      cron.schedule.mockImplementation(cronHandler);

      scheduleAutomationTask(taskFn, "* * * * *", "job-exec", true, {
        skipIfRecentRun: false,
        maxRetries: 0,
      });

      await cronHandler.mock.calls[0][1](); // Simulate execution

      const stats = getJobStats("job-exec_* * * * *");
      expect(stats.history.successfulRuns).toBe(1);
      expect(taskFn).toHaveBeenCalled();
    });
  });

  describe("getJobStats", () => {
    it("should return lock and history for a specific job", () => {
      const fn = jest.fn();
      scheduleAutomationTask(fn, "* * * * *", "stats-job", true, {
        skipIfRecentRun: false,
      });

      const id = "stats-job_* * * * *";
      const stats = getJobStats(id);

      expect(stats).toHaveProperty("locks");
      expect(stats).toHaveProperty("history");
    });

    it("should return all stats when no jobId is provided", () => {
      const stats = getJobStats();
      expect(stats).toHaveProperty("activeLocks");
      expect(stats).toHaveProperty("allHistory");
    });
  });

  describe("getCronScheduleStrings", () => {
    it("should return cron expression mappings", () => {
      const cronStrings = getCronScheduleStrings();
      expect(cronStrings.everyMinute).toBe("* * * * *");
      expect(cronStrings.everyHour).toBe("0 * * * *");
      expect(Object.keys(cronStrings)).toContain("everyDay");
    });
  });
});

// ──────────────────────────────────────────────────────────
// TESTING setupMonitoringEndpoints
// ──────────────────────────────────────────────────────────

describe("setupMonitoringEndpoints", () => {
  let app;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    jest.clearAllMocks();
  });

  it("applies a single middleware and hits /job-status", async () => {
    const mw = jest.fn((req, res, next) => next());

    setupMonitoringEndpoints(app, "test-instance", {
      basePath: "/monitor",
      requireAuth: true,
      authMiddleware: mw,
      enableJobStatus: true,
    });

    const res = await request(app).post("/monitor/job-status");

    expect(mw).toHaveBeenCalled();
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("success", true);
    expect(res.body).toHaveProperty("instanceId", "test-instance");
  });

  it("applies multiple middleware in order", async () => {
    const calls = [];
    const mw1 = (req, res, next) => {
      calls.push("mw1");
      next();
    };
    const mw2 = (req, res, next) => {
      calls.push("mw2");
      next();
    };

    setupMonitoringEndpoints(app, "multi-instance", {
      basePath: "/multi",
      requireAuth: true,
      authMiddleware: [mw1, mw2],
      enableJobStatus: true,
    });

    const res = await request(app).post("/multi/job-status");

    expect(calls).toEqual(["mw1", "mw2"]);
    expect(res.status).toBe(200);
  });

  it("logs error and skips setup if middleware is missing when requireAuth is true", () => {
    setupMonitoringEndpoints(app, "fail-instance", {
      requireAuth: true,
      authMiddleware: null,
    });

    expect(logger).toHaveBeenCalledWith(
      "Authentication middleware is required when requireAuth is true, and it must be a non-empty array of functions",
      "error"
    );
  });

  it("calls triggerHistoryCleanup with correct days", async () => {
    const mw = (req, res, next) => next();

    setupMonitoringEndpoints(app, "test-instance", {
      basePath: "/cleanup",
      requireAuth: true,
      authMiddleware: mw,
      enableCleanup: true,
    });

    const res = await request(app)
      .post("/cleanup/cleanup-history")
      .send({ days: 30 });

    expect(res.status).toBe(200);
    expect(triggerHistoryCleanup).toHaveBeenCalledWith(30);
  });

  it("returns 400 if days param is invalid", async () => {
    const mw = (req, res, next) => next();

    setupMonitoringEndpoints(app, "bad-cleanup", {
      basePath: "/cleanup-bad",
      requireAuth: true,
      authMiddleware: mw,
      enableCleanup: true,
    });

    const res = await request(app)
      .post("/cleanup-bad/cleanup-history")
      .send({ days: 0 });

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("success", false);
  });

  it("responds with healthy = true on scheduler-health", async () => {
    const mw = (req, res, next) => next();

    setupMonitoringEndpoints(app, "health-check", {
      basePath: "/health",
      requireAuth: true,
      authMiddleware: mw,
      enableJobControl: true,
    });

    const res = await request(app).post("/health/scheduler-health");

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("healthy", true);
  });

  it("responds with aggregate stats on job-stats", async () => {
    const mw = (req, res, next) => next();

    setupMonitoringEndpoints(app, "stat-check", {
      basePath: "/stats",
      requireAuth: true,
      authMiddleware: mw,
      enableJobControl: true,
    });

    const res = await request(app).post("/stats/job-stats");

    expect(res.status).toBe(200);
    expect(res.body.aggregate).toEqual(
      expect.objectContaining({
        totalJobs: 1,
        totalRuns: 10,
        totalSuccessful: 9,
        totalFailed: 1,
      })
    );
  });
});
