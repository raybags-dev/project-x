import bodyParser from "body-parser";
import cors from "cors";
import express from "express";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import { validateAutomationContextVars } from "./middleware/automationTools.js";
import scheduleAutomationTask, {
  getCronScheduleStrings,
} from "./middleware/cronUtility.js";

import { dynoActivator, wakeupService } from "./middleware/ping_service.js";
import runAutoReviewAggregator from "./src/argent/automator.js";
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

// Get instance ID from environment variable (defaults to 1)
const INSTANCE_ID = process.env.INSTANCE_ID || "1";
// Only run automation on instance 1 to avoid conflicts
const RUN_AUTOMATION = INSTANCE_ID === "1";
// Get cron schedule strings
const CRON_SCHEDULES = getCronScheduleStrings();

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
app.use(morgan(`tiny :date[iso] [Instance-${INSTANCE_ID}]`));
app.use(express.static(path.join(__dirname, "public")));
app.use(wakeupService);

// Load balancer and health check routes
nginxRoutesHandler(app, INSTANCE_ID, RUN_AUTOMATION);

miscellaneous(app);
profileGeneratorHandler(app);
reviewGeneratorHandler(app);
generalRoutesHandler(app);
startUp(app);
handleNotSupported(app);
dynoActivator();

// Only schedule automation tasks on instance 1
if (RUN_AUTOMATION) {
  console.log(`Setting up cron jobs on instance ${INSTANCE_ID}`);
  scheduleAutomationTask(runAutoReviewAggregator, CRON_SCHEDULES.every8hrs);
  scheduleAutomationTask(runAutoReviewAggregator, CRON_SCHEDULES.every1month);
  scheduleAutomationTask(runAutoReviewAggregator, CRON_SCHEDULES.every6months);
} else {
  console.log(`Skipping cron jobs setup for instance ${INSTANCE_ID}`);
}
export default app;
