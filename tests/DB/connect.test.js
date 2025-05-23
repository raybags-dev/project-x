import mongoose from "mongoose";
import connectToDB from "../../src/DB/connect.js";
import { devLogger } from "../../src/loggers/devLogger.js";

// Mock dependencies
jest.mock("mongoose");
jest.mock("../../src/loggers/devLogger.js");

// Mock the setTimeout function to execute immediately
jest.spyOn(global, "setTimeout").mockImplementation((callback) => callback());

describe("connectToDB", () => {
  let mockConnection;
  let mockAdmin;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mongoose mock
    mockAdmin = {
      command: jest.fn().mockResolvedValue({ version: "6.0.0" }),
    };

    mockConnection = {
      connection: {
        db: {
          admin: jest.fn().mockReturnValue(mockAdmin),
        },
      },
    };

    // Setup mongoose mocks
    mongoose.set = jest.fn();
    mongoose.connect = jest.fn().mockResolvedValue(mockConnection);
  });

  test("skips connection when isConnect is false", async () => {
    await connectToDB("mongodb://test", false);

    expect(devLogger).toHaveBeenCalledWith(
      "Database connection skipped.",
      "warn"
    );
    expect(mongoose.connect).not.toHaveBeenCalled();
  });

  test("connects to database successfully", async () => {
    const result = await connectToDB("mongodb://test", true);

    expect(mongoose.set).toHaveBeenCalledWith("strictQuery", true);
    expect(mongoose.connect).toHaveBeenCalledWith("mongodb://test", {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 150000,
    });
    expect(mockConnection.connection.db.admin).toHaveBeenCalled();
    expect(mockAdmin.command).toHaveBeenCalledWith({ buildInfo: 1 });
    expect(devLogger).toHaveBeenCalledWith(
      "Connected to Database ✓ ✓ ✓ ✓",
      "info"
    );
    expect(result).toBe(mockConnection);
  });

  test("handles connection error and retries", async () => {
    // Mock implementation to simulate failure then success
    let callCount = 0;
    mongoose.connect.mockImplementation(async () => {
      if (callCount === 0) {
        callCount++;
        throw new Error("Connection failed");
      }
      return mockConnection;
    });

    const result = await connectToDB("mongodb://test", true);

    expect(mongoose.connect).toHaveBeenCalledTimes(2);
    expect(devLogger).toHaveBeenCalledWith(
      expect.stringContaining("Connection failed"),
      "error"
    );
    expect(result).toBe(mockConnection);
  });
});
