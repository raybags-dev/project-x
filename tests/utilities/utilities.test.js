import axiosInstance from "../../src/downloader/HTTPEngine.js";
import * as utilities from "../../src/utilities/utilities.js";

jest.mock("../../src/downloader/HTTPEngine.js", () => ({
  get: jest.fn(),
}));
describe("Utilities Module", () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: { frontFacingUrl: "https://example.com" }, headers: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  it("should test extractISODate", () => {
    const result = utilities.extractISODate("2025-05-01T10:39:47.483Z");
    expect(result).toBe("2025-05-01");
  });

  it("should test isUserSubscribed", async () => {
    const result = await utilities.isUserSubscribed({ userId: "123" });
    expect(result).toBe(false);
  });

  it("should test cleanUpBaseUrl", () => {
    const result = utilities.cleanUpBaseUrl("https://example.com/path?query=1");
    expect(result).toBe("https://example.com/path");
  });

  it("should test validateEndpointDomain", () => {
    const mockValidateEndpointDomain = jest.fn(() => true);
    utilities.validateEndpointDomain = mockValidateEndpointDomain;
    const result = utilities.validateEndpointDomain("https://example.com", req);
    expect(result).toBe(true);
    expect(mockValidateEndpointDomain).toHaveBeenCalledWith(
      "https://example.com",
      req
    );
  });

  it("should test extractData", () => {
    const result = utilities.extractData(
      "https://example.com/hotel123",
      /hotel(\d+)/
    );
    expect(result).toBe("123");
  });

  it("should test convertUnixToDate", () => {
    const result = utilities.convertUnixToDate(1651363200); // Example Unix timestamp
    expect(result).toBe("2022-05-01");
  });

  it("should test formatReviewBodyString", () => {
    const result = utilities.formatReviewBodyString(
      "Negative feedback",
      "Positive feedback",
      "General comments"
    );
    expect(result).toBe(
      "General comments\n\nBad: Negative feedback\n\nGood: Positive feedback"
    );
  });

  it("should test validateRequest with valid data", () => {
    const result = utilities.validateRequest({
      name: "John Doe",
      email: "john.doe@example.com",
      password: "password123",
    });
    expect(result).toBeNull();
  });

  it("should test validateRequest with missing fields", () => {
    const result = utilities.validateRequest({
      name: "",
      email: "",
      password: "",
    });
    expect(result).toEqual({ error: "All fields are required" });
  });

  it("should test sanitizeUser", () => {
    const user = {
      name: "John Doe",
      email: "john.doe@example.com",
      password: "password123",
      superUserToken: "secret",
      __v: 0,
    };

    const sanitizedUser = utilities.sanitizeUser(user);

    expect(sanitizedUser).toEqual({
      name: "John Doe",
      email: "john.doe@example.com",
      password: "retracted",
      superUserToken: "retracted",
      __v: "retracted",
    });
  });

  it("should test generateMessage with saved and collected reviews", () => {
    const result = utilities.generateMessage(["Review 1", "Review 2"], {
      length: 3,
    });
    expect(result).toBe("2 new objects were saved, out of 3 total collected.");
  });

  it("should test generateMessage with only saved reviews", () => {
    const result = utilities.generateMessage(["Review 1"], { length: 0 });
    expect(result).toBe("1 new objects were saved.");
  });

  it("should test generateMessage with only collected reviews", () => {
    const result = utilities.generateMessage([], { length: 5 });
    expect(result).toBe("5 objects were collected - nothing new saved.");
  });

  it("should test generateMessage with no reviews", () => {
    const result = utilities.generateMessage([], { length: 0 });
    expect(result).toBe("No objects were collected.");
  });

  it("should test holdOnFor", async () => {
    const start = Date.now();
    await utilities.holdOnFor(500); // Wait for 500ms
    const end = Date.now();
    expect(end - start).toBeGreaterThanOrEqual(500);
  });

  it("should test getAgodaCreds with valid response", async () => {
    axiosInstance.get.mockResolvedValue({
      status: 200,
      data: "hotelId:12345 propertyId:67890 hotel_id=54321",
    });

    const result = await utilities.getAgodaCreds({
      body: { frontFacingUrl: "https://example.com" },
    });

    expect(result).toBe("12345"); // First match
    expect(axiosInstance.get).toHaveBeenCalledWith("https://example.com", {
      headers: expect.any(Object),
    });
  });

  it("should test handleCSP in production mode", () => {
    const app = { use: jest.fn() };
    process.env.NODE_ENV = "production";

    utilities.handleCSP(app);

    expect(app.use).toHaveBeenCalled();
    delete process.env.NODE_ENV;
  });
});
describe("handleSchedulerResult", () => {
  let mockLogger;

  beforeEach(() => {
    mockLogger = jest.fn();
  });

  describe("when RUN_AUTOMATION is false", () => {
    it("should return early and log automation disabled message", () => {
      const schedulerResult = { success: true, message: "Test message" };

      utilities.handleSchedulerResult(schedulerResult, false, mockLogger);

      expect(mockLogger).toHaveBeenCalledWith(
        "All cron jobs turned off",
        "warn"
      );
    });

    it("should return early and log automation disabled message for failed scheduler result", () => {
      const schedulerResult = { success: false, error: "Test error" };

      utilities.handleSchedulerResult(schedulerResult, false, mockLogger);

      expect(mockLogger).toHaveBeenCalledWith(
        "All cron jobs turned off",
        "warn"
      );
    });
  });

  describe("when RUN_AUTOMATION is true", () => {
    describe("successful scheduler results", () => {
      it("should log success message with info level", () => {
        const schedulerResult = {
          success: true,
          message: "Operation completed",
        };

        utilities.handleSchedulerResult(schedulerResult, true, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith(
          "✅ Scheduler: Operation completed",
          "info"
        );
      });

      it("should handle success with error property (uses message over error)", () => {
        const schedulerResult = {
          success: true,
          message: "Success message",
          error: "Some error",
        };

        utilities.handleSchedulerResult(schedulerResult, true, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith(
          "✅ Scheduler: Success message",
          "info"
        );
      });

      it("should use error property when message is undefined", () => {
        const schedulerResult = { success: true, error: "Fallback error" };

        utilities.handleSchedulerResult(schedulerResult, true, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith(
          "✅ Scheduler: Fallback error",
          "info"
        );
      });

      it("should handle empty message (falls back to error)", () => {
        const schedulerResult = { success: true, message: "" };

        utilities.handleSchedulerResult(schedulerResult, true, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith(
          "✅ Scheduler: undefined",
          "info"
        );
      });

      it("should handle null message (falls back to error)", () => {
        const schedulerResult = { success: true, message: null };

        utilities.handleSchedulerResult(schedulerResult, true, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith(
          "✅ Scheduler: undefined",
          "info"
        );
      });
    });

    describe("failed scheduler results", () => {
      it("should log error message with error level", () => {
        const schedulerResult = { success: false, error: "Operation failed" };

        utilities.handleSchedulerResult(schedulerResult, true, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith(
          "❌ Scheduler failed: Operation failed",
          "error"
        );
      });

      it("should handle failure with message property", () => {
        const schedulerResult = { success: false, message: "Failure message" };

        utilities.handleSchedulerResult(schedulerResult, true, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith(
          "❌ Scheduler failed: Failure message",
          "error"
        );
      });

      it("should prefer message over error when both are present", () => {
        const schedulerResult = {
          success: false,
          message: "Primary message",
          error: "Secondary error",
        };

        utilities.handleSchedulerResult(schedulerResult, true, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith(
          "❌ Scheduler failed: Primary message",
          "error"
        );
      });

      it("should handle missing message and error properties", () => {
        const schedulerResult = { success: false };

        utilities.handleSchedulerResult(schedulerResult, true, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith(
          "❌ Scheduler failed: undefined",
          "error"
        );
      });
    });

    describe("edge cases", () => {
      it("should handle truthy non-boolean success values", () => {
        const schedulerResult = { success: "true", message: "Test" };

        utilities.handleSchedulerResult(schedulerResult, true, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith("✅ Scheduler: Test", "info");
      });

      it("should handle falsy non-boolean success values", () => {
        const schedulerResult = { success: 0, message: "Test" };

        utilities.handleSchedulerResult(schedulerResult, true, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith(
          "❌ Scheduler failed: Test",
          "error"
        );
      });

      it("should handle missing success property", () => {
        const schedulerResult = { message: "Test message" };

        utilities.handleSchedulerResult(schedulerResult, true, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith(
          "❌ Scheduler failed: Test message",
          "error"
        );
      });

      it("should handle empty scheduler result object", () => {
        const schedulerResult = {};

        utilities.handleSchedulerResult(schedulerResult, true, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith(
          "❌ Scheduler failed: undefined",
          "error"
        );
      });
    });

    describe("RUN_AUTOMATION truthy values", () => {
      it("should work with truthy non-boolean values", () => {
        const schedulerResult = { success: true, message: "Test" };

        utilities.handleSchedulerResult(schedulerResult, "true", mockLogger);

        expect(mockLogger).toHaveBeenCalledWith("✅ Scheduler: Test", "info");
      });

      it("should work with numeric truthy values", () => {
        const schedulerResult = { success: true, message: "Test" };

        utilities.handleSchedulerResult(schedulerResult, 1, mockLogger);

        expect(mockLogger).toHaveBeenCalledWith("✅ Scheduler: Test", "info");
      });
    });
  });
});
