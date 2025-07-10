import {
  getCurrentJobStatus,
  setupCronJobs,
  triggerHistoryCleanup,
} from "../../src/cron/cronScheduler.js";

import * as cronUtility from "../../middleware/cronUtility.js";
import { logger } from "../../src/loggers/logger.js";

jest.mock("../../middleware/cronUtility.js");
jest.mock("../../src/loggers/logger.js");

describe("cronManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.TEST_MODE = "true";
  });

  describe("setupCronJobs", () => {
    const dummyTask = jest.fn();

    it("throws error if taskFunction is not provided", () => {
      expect(() => setupCronJobs({})).toThrow(
        "taskFunction is required and must be a function"
      );
    });

    it("returns early when runAutomation is false", () => {
      const result = setupCronJobs({
        taskFunction: dummyTask,
        runAutomation: false,
        instanceId: "test-instance",
      });

      expect(logger).toHaveBeenCalledWith(
        "Skipping cron jobs setup for instance test-instance"
      );
      expect(result).toEqual({
        success: false,
        message: "Automation disabled",
        scheduledJobs: [],
      });
    });
  });

  describe("getCurrentJobStatus", () => {
    it("returns job stats", () => {
      const mockStats = { allHistory: [], activeLocks: [] };
      cronUtility.getJobStats.mockReturnValue(mockStats);

      const result = getCurrentJobStatus();
      expect(result).toBe(mockStats);
    });
  });

  describe("triggerHistoryCleanup", () => {
    it("calls cleanupJobHistory with default 7 days", () => {
      const mockCleanup = jest.fn();
      cronUtility.cleanupJobHistory = mockCleanup;

      triggerHistoryCleanup();
      expect(mockCleanup).toHaveBeenCalledWith(7);
    });

    it("calls cleanupJobHistory with custom number of days", () => {
      const mockCleanup = jest.fn();
      cronUtility.cleanupJobHistory = mockCleanup;

      triggerHistoryCleanup(30);
      expect(mockCleanup).toHaveBeenCalledWith(30);
    });
  });
});
