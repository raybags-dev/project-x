import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { validateAutomationContextVars } from "./middleware/automationTools.js";
import { dynoActivator, wakeupService } from "./middleware/ping_service.js";
import runAutoReviewAggregator from "./src/argent/automator.js";
import {
  getDefaultSchedulerConfig,
  runScheduler,
} from "./src/cron/schedulerExec.js";
import { logger } from "./src/loggers/logger.js";

import startUp from "./src/startup.js";
import {
  injectNonceToLocalScripts,
  setupNoncedRoute,
} from "./src/utilities//injectionUtility.js";
import {
  handleNotSupported,
  miscellaneous,
} from "./src/utilities/miscellaneous.js";
import { handleCSP } from "./src/utilities/utilities.js";
import generalRoutesHandler from "./src/workers/generalRoutesHandler.js";
import nginxRoutesHandler from "./src/workers/nginxRoutesHandler.js";
import profileGeneratorHandler from "./src/workers/profileGenRoutesHandler.js";
import reviewGeneratorHandler from "./src/workers/reviewGenRoutesHandler.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

const INSTANCE_ID = process.env.INSTANCE_ID || "1";
const RUN_AUTOMATION = INSTANCE_ID === "1";

console.log(`Starting application instance ${INSTANCE_ID}`);
console.log(
  `Automation ${RUN_AUTOMATION ? "ENABLED" : "DISABLED"} for this instance`
);

validateAutomationContextVars();
handleCSP(app);
setupNoncedRoute(app);
injectNonceToLocalScripts(app);

app.set("trust proxy", 1);
app.use(cors());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(morgan(` :date[iso] [Instance-${INSTANCE_ID}]`));
app.use(express.static(path.join(__dirname, "public")));
app.use(wakeupService);

nginxRoutesHandler(app, INSTANCE_ID, RUN_AUTOMATION);

miscellaneous(app);
profileGeneratorHandler(app);
reviewGeneratorHandler(app);
generalRoutesHandler(app);
startUp(app);
handleNotSupported(app);
dynoActivator();

const schedulerResult = runScheduler({
  taskFunction: runAutoReviewAggregator,
  runAutomation: RUN_AUTOMATION,
  instanceId: INSTANCE_ID,
  app: app,
  ...getDefaultSchedulerConfig(),
});

if (RUN_AUTOMATION) {
  const success = schedulerResult.success;
  const prefix = success ? "✅ Scheduler" : "❌ Scheduler failed";
  const message = `${prefix}: ${
    schedulerResult.message || schedulerResult.error
  }`;
  logger(message, success ? "info" : "error");
}

export default app;
