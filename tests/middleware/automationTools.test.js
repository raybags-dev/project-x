import cron from "node-cron";
import scheduleAutomationTask, {
  getCronScheduleStrings,
} from "../../middleware/cronUtility.js";

import { logger } from "../../src/loggers/logger.js";

jest.mock("node-cron", () => ({
  schedule: jest.fn(),
}));

jest.mock("../../src/loggers/logger.js", () => ({
  logger: jest.fn(),
}));

describe("scheduleAutomationTask", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("should not schedule if run_automation is false", () => {
    const mockFn = jest.fn();
    scheduleAutomationTask(mockFn, "* * * * *", false);

    expect(logger).toHaveBeenCalledWith(
      "cron tiggers for auto-extraction disabled. Task will not run.",
      "info"
    );
    expect(cron.schedule).not.toHaveBeenCalled();
  });

  it("should not schedule if taskFn is not a function", () => {
    scheduleAutomationTask(null, "* * * * *", true);

    expect(logger).toHaveBeenCalledWith(
      "Invalid task function provided to scheduler",
      "error"
    );
    expect(cron.schedule).not.toHaveBeenCalled();
  });

  it("should schedule the task correctly", () => {
    const mockFn = jest.fn();
    scheduleAutomationTask(mockFn, "* * * * *", true);

    expect(logger).toHaveBeenCalledWith(
      "Scheduled task with cron: '* * * * *'",
      "info"
    );
    expect(cron.schedule).toHaveBeenCalledTimes(1);
  });
});

describe("getCronScheduleStrings", () => {
  it("should return correct cron strings", () => {
    const result = getCronScheduleStrings();
    expect(result).toEqual({
      everyDay: "0 0 * * *",
      every8hrs: "0 */8 * * *",
      every6hrs: "0 */6 * * *",
      every1month: "0 0 1 * *",
    });
  });
});
