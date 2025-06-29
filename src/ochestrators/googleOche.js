import "dotenv/config";
import {
  browserHealthCheck,
  launchBrowser,
  testChromeDetection,
} from "../downloader/browserEngine.js";
import { logger } from "../loggers/logger.js";
import fetchAndSaveGoogleReviews from "../utilities/browserWorkers/browserWorker.js";
import utilityRegistry from "../utilities/events/eventHandlers.js";
import { holdOnFor } from "../utilities/utilities.js";
const {
  handleGoogleCookieDialogue,
  handleGoogleReviewTabBtn,
  handleGoogleReviewFIlterSelection,
  handleRecentReviewFIlterSelection,
} = utilityRegistry;

const isProduction = process.env.NODE_ENV === "production";
const isHeadlessModeEnabled = true;

export default async function headlessManager(
  originalUrl,
  depth,
  runType,
  headers,
  user = {}
) {
  try {
    let browser;
    let page;
    let reviewsList = [];

    const totalPagesToFetch = depth
      ? parseInt(depth) || 10
      : runType === "INITIAL" || depth === "full"
      ? Infinity
      : Infinity;

    try {
      //test browser detection - If the test fails exit
      const testResult = await testChromeDetection();
      console.log("Detection result:", testResult);
      if (!testResult.success) {
        console.warn("Browser detection failed:", testResult.error);
        throw new Error(`Browser test! Exiting...: ${testResult.error}`);
      }

      // check browser health checks.
      const healthCheck = await browserHealthCheck();
      if (!healthCheck.healthy) {
        console.warn("Browser system unhealthy:", healthCheck.error);
        throw new Error(`Browser system unhealthy: ${healthCheck.error}`);
      }

      browser = isProduction
        ? await launchBrowser(isHeadlessModeEnabled)
        : await launchBrowser();

      if (!browser || typeof browser.newPage !== "function") {
        throw new Error("Browser instance is not valid");
      }

      page = await browser.newPage();
      logger("New page created", "info");

      await page.setViewport({ width: 1280, height: 800 });
      await page.setExtraHTTPHeaders(headers);

      await page.goto(originalUrl, {
        waitUntil: "domcontentloaded",
        timeout: 5000,
      });

      await holdOnFor(500);
      await handleGoogleCookieDialogue(page);
      await holdOnFor(500);
      await handleGoogleReviewTabBtn(page);
      await holdOnFor(500);
      await handleGoogleReviewFIlterSelection(page);
      await holdOnFor(500);
      await handleRecentReviewFIlterSelection(page);

      const allReviews = await fetchAndSaveGoogleReviews(
        page,
        totalPagesToFetch,
        user
      );

      reviewsList = allReviews;
      return allReviews;
    } catch (error) {
      logger(`Error during review extraction flow: ${error}`, "warn");
      logger(`ErrorStack: ${error.stack}`, "error");
    } finally {
      if (browser) {
        try {
          await browser.close();
          logger("Browser closed");
        } catch (closeErr) {
          logger(`Error closing browser: ${closeErr}`, "error");
        }
      }
    }
    return reviewsList;
  } catch (error) {
    logger(`Process failed in <extractReviewsFromBrowser>: ${error}`);
    return reviewsList;
  }
}
