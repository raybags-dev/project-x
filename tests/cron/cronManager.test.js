import {
  getCurrentJobStatus,
  setupCronJobs,
  triggerHistoryCleanup,
} from "../../src/cron/cronScheduler.js";

import scheduleAutomationTask, * as cronUtility from "../../middleware/cronUtility.js";
import { logger } from "../../src/loggers/logger.js";

// Mock dependencies
jest.mock("../../middleware/cronUtility.js");
jest.mock("../../src/loggers/logger.js");

describe("cronManager", () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    it("schedules all cron jobs successfully", () => {
      cronUtility.getCronScheduleStrings.mockReturnValue({
        every8Hours: "0 */8 * * *",
        everyDayOffset: "30 1 * * *",
        every1month: "0 3 1 * *",
        every6months: "0 4 1 1,7 *",
      });

      scheduleAutomationTask.mockImplementation(() => {});

      const result = setupCronJobs({
        taskFunction: dummyTask,
        runAutomation: true,
        instanceId: "test-instance",
      });

      expect(logger).toHaveBeenCalledWith(
        "Setting up cron jobs on instance test-instance"
      );
      expect(result.success).toBe(true);
      expect(result.scheduledJobs.length).toBe(5); // 4 main + 1 cleanup
      expect(scheduleAutomationTask).toHaveBeenCalledTimes(5);
    });

    it("returns error object if scheduling throws", () => {
      cronUtility.getCronScheduleStrings.mockReturnValue({
        every8Hours: "bad_cron",
        everyDayOffset: "bad_cron",
        every1month: "bad_cron",
        every6months: "bad_cron",
      });

      scheduleAutomationTask.mockImplementation(() => {
        throw new Error("Cron scheduling failed");
      });

      const result = setupCronJobs({
        taskFunction: dummyTask,
        runAutomation: true,
        instanceId: "fail-case",
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe("Cron scheduling failed");
      expect(result.scheduledJobs).toEqual([]);
      expect(result.error).toBeInstanceOf(Error);
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
