import path from "path";
import {
  browserHealthCheck,
  launchBrowser,
  testChromeDetection,
} from "../downloader/browserEngine.js";
import {
  extractUrlsFromPage,
  filterUrlsBySlug,
  loadSupportedSlugs,
} from "../utilities/utilities.js";

import { HEADERS } from "../data/headers/headers.js";
import { logger } from "../loggers/logger.js";

const isProduction = process.env.NODE_ENV === "production";
const isHeadlessModeEnabled = true;

const MAX_RETRIES = 3;
const SLUG_FILE_PATH = path.resolve("./src/data/slugs/slugs.txt");

export async function handleSearchRequest(req, res) {
  const keyword = req.body?.searchKeyword;
  if (!keyword || typeof keyword !== "string") {
    logger("Invalid or missing search keyword", "warn");
    return res
      .status(400)
      .json({ error: "Missing or invalid searchKeyword in request body" });
  }

  const query = keyword.trim().split(/\s+/).join("+");
  const baseUrl = `https://www.google.com/search?q=${query}&oq=${query}&sourceid=chrome&ie=UTF-8`;

  let browser, page;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      logger(`Attempt ${attempt}: Starting search for "${keyword}"`, "info");

      const testResult = await testChromeDetection();
      if (!testResult.success)
        throw new Error(`Browser detection failed: ${testResult.error}`);

      const health = await browserHealthCheck();
      if (!health.healthy)
        throw new Error(`Browser health check failed: ${health.error}`);

      browser = isProduction
        ? await launchBrowser(isHeadlessModeEnabled)
        : await launchBrowser();

      if (!browser || typeof browser.newPage !== "function")
        throw new Error("Invalid browser instance");

      page = await browser.newPage();
      logger("New page created", "info");

      const headers = HEADERS.googleHeadersGenProfile;
      await page.setViewport({ width: 1280, height: 800 });
      await page.setExtraHTTPHeaders(headers);

      await page.goto(baseUrl, {
        waitUntil: "domcontentloaded",
        timeout: 7000,
      });

      const content = await page.content();
      const urls = extractUrlsFromPage(content);
      const supportedSlugs = await loadSupportedSlugs(SLUG_FILE_PATH);

      const matchedUrls = filterUrlsBySlug(urls, supportedSlugs);

      await page.close();
      await browser.close();

      logger(`Found ${matchedUrls.length} matched URLs`, "info");
      return res.status(200).json({ urls: matchedUrls });
    } catch (error) {
      logger(`Attempt ${attempt} failed: ${error.message}`, "error");

      if (page && !page.isClosed()) await page.close().catch(() => {});
      if (browser) await browser.close().catch(() => {});

      if (attempt === MAX_RETRIES) {
        return res
          .status(500)
          .json({ error: "Failed to process request after multiple attempts" });
      }
    }
  }
}
