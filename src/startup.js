import "dotenv/config";
import connectDB from "./DB/connect.js";
import { devLogger } from "./loggers/devLogger.js";
import { clearDevPort } from "./utilities/cleanUp.js";

const { MONGO_URI } = process.env;

async function starterLogger(port, instanceId) {
  try {
    const memoryUsage = process.memoryUsage();
    const currentMemory =
      Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100;
    const currentTime = new Date().toLocaleString();
    const environment = process.env.NODE_ENV || "development";
    const currentUser = process.env.USER || "guest_user";
    const logname = process.env.LOGNAME || "placeholder";

    devLogger(
      `[Instance-${instanceId}] Memory usage: ${currentMemory} MB`,
      "info"
    );
    devLogger(`[Instance-${instanceId}] Current time: ${currentTime}`, "info");
    devLogger(`[Instance-${instanceId}] Environment: ${environment}`, "info");
    devLogger(`[Instance-${instanceId}] User: ${currentUser}`, "info");
    devLogger(`[Instance-${instanceId}] Log name: ${logname}`, "info");
    devLogger(
      `[Instance-${instanceId}] Server running on port: ${port}`,
      "info"
    );
  } catch (e) {
    devLogger(
      `[Instance-${instanceId}] Error occurred in starterLogger function: ${e}`,
      "error"
    );
  }
}

const startServer = async (app, port, instanceId, attempt = 1) => {
  try {
    await new Promise((resolve, reject) => {
      const server = app.listen(port, "0.0.0.0", async () => {
        await starterLogger(port, instanceId);
        await connectDB(MONGO_URI, true);
        devLogger(
          `[Instance-${instanceId}] Server successfully started on port ${port}`,
          "info"
        );
        resolve(server);
      });

      server.on("error", reject);

      app.locals.server = server;
    });
  } catch (err) {
    if (err.code === "EADDRINUSE") {
      devLogger(
        `[Instance-${instanceId}] Port ${port} is already in use. Attempting to resolve...`,
        "warn"
      );
      try {
        await clearDevPort(port);
      } catch (cleanupErr) {
        devLogger(
          `[Instance-${instanceId}] Error checking or killing port ${port}: ${cleanupErr.message}`,
          "error"
        );
        throw cleanupErr;
      }

      if (attempt < 3) {
        devLogger(
          `[Instance-${instanceId}] Retrying to start server on port ${port}...`,
          "info"
        );
        await startServer(app, port, instanceId, attempt + 1);
      } else {
        devLogger(
          `[Instance-${instanceId}] Failed to start server after ${attempt} attempts.`,
          "error"
        );
        process.exit(1);
      }
    } else {
      devLogger(`[Instance-${instanceId}] Server error: ${err}`, "error");
      process.exit(1);
    }
  }
};

export default async function (app) {
  try {
    const PORT = process.env.PORT || 3001;
    const INSTANCE_ID = process.env.INSTANCE_ID || "1";

    devLogger(`[Instance-${INSTANCE_ID}] Starting up application...`, "info");

    // URL rewriting middleware for load balancer compatibility
    app.use("/raybags/v1/review-crawler/*", (req, res, next) => {
      let newUrl = req.url.replace(
        "/raybags/v1/review-crawler/",
        `http://localhost:${PORT}/raybags/v1/review-crawler/`
      );
      req.url = newUrl;
      next();
    });

    // Start server with retry logic
    await startServer(app, PORT, INSTANCE_ID);

    // Handle cleanup on process termination
    const cleanUpAndExit = (signal) => {
      devLogger(
        `[Instance-${INSTANCE_ID}] Received ${signal}. Cleaning up and exiting...`,
        "info"
      );

      // Graceful shutdown
      if (app.locals.server) {
        app.locals.server.close(() => {
          devLogger(
            `[Instance-${INSTANCE_ID}] Server closed successfully`,
            "info"
          );
          process.exit(0);
        });

        // Force exit after 10 seconds
        setTimeout(() => {
          devLogger(
            `[Instance-${INSTANCE_ID}] Force exit after timeout`,
            "warn"
          );
          process.exit(1);
        }, 10000);
      } else {
        process.exit(0);
      }
    };

    // Handle different termination signals
    process.on("SIGINT", () => cleanUpAndExit("SIGINT"));
    process.on("SIGTERM", () => cleanUpAndExit("SIGTERM"));
    process.on("exit", () => {
      devLogger(
        `[Instance-${INSTANCE_ID}] Process exit: performing cleanup...`,
        "info"
      );
    });

    // Handle uncaught exceptions
    process.on("uncaughtException", (err) => {
      devLogger(
        `[Instance-${INSTANCE_ID}] Uncaught Exception: ${err.message}`,
        "error"
      );
      devLogger(`[Instance-${INSTANCE_ID}] Stack: ${err.stack}`, "error");
      cleanUpAndExit("uncaughtException");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      devLogger(
        `[Instance-${INSTANCE_ID}] Unhandled Rejection at: ${promise}, reason: ${reason}`,
        "error"
      );
      cleanUpAndExit("unhandledRejection");
    });

    devLogger(
      `[Instance-${INSTANCE_ID}] Application startup completed successfully`,
      "info"
    );
  } catch (error) {
    const INSTANCE_ID = process.env.INSTANCE_ID || "1";
    let msg = error.message;

    if (msg.includes("Cannot read properties of null (reading")) {
      devLogger(
        `[Instance-${INSTANCE_ID}] Error: Invalid configuration build. See <configurations/configs.json>`,
        "warn"
      );
    }
    devLogger(
      `[Instance-${INSTANCE_ID}] Error during startup: ${error}`,
      "error"
    );
    devLogger(`[Instance-${INSTANCE_ID}] Stack trace: ${error.stack}`, "error");
    process.exit(1);
  }
}
