import "dotenv/config";
import fs from "fs";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { logger } from "../loggers/logger.js";
import { getExecutablePath } from "../utilities/chromiumExecPath.js";

const isProduction = process.env.NODE_ENV === "production";
const envExecPath = "/usr/bin/chromium";
let stealthApplied = false;

const commonLaunchArgs = [
  "--no-sandbox",
  "--disable-setuid-sandbox",
  "--disable-dev-shm-usage",
  "--disable-gpu",
  "--no-first-run",
  "--no-default-browser-check",
  "--disable-default-apps",
  "--disable-features=IsolateOrigins,site-per-process",
  "--disable-http2",
  "--disable-blink-features=AutomationControlled",
  "--disable-background-timer-throttling",
  "--disable-backgrounding-occluded-windows",
  "--disable-renderer-backgrounding",
  "--disable-features=TranslateUI",
  "--disable-ipc-flooding-protection",
];

async function testChromeExecutable(executablePath) {
  if (!fs.existsSync(executablePath)) {
    throw new Error(`Chrome not found at: ${executablePath}`);
  }

  try {
    await fs.promises.access(executablePath, fs.constants.X_OK);
  } catch {
    logger(`⚠️ Chrome at ${executablePath} is not executable`, "warn");
  }

  try {
    logger(`Testing Chrome at: ${executablePath}`, "info");
    const browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: commonLaunchArgs,
      timeout: 30000,
    });

    const page = await browser.newPage();
    await page.goto("data:text/html,<h1>Test</h1>", {
      waitUntil: "domcontentloaded",
    });

    const title = await page.evaluate(
      () => document.querySelector("h1")?.textContent
    );
    await browser.close();

    if (title !== "Test") {
      throw new Error("Test page did not load correctly");
    }

    logger(`✅ Chrome test passed at: ${executablePath}`, "info");
    return true;
  } catch (err) {
    logger(
      `❌ Chrome test failed at ${executablePath}: ${err.message}`,
      "error"
    );
    throw err;
  }
}

async function resolveAndTestChromePath() {
  const testedPaths = [];

  const tryPath = async (path, label) => {
    if (!testedPaths.includes(path)) {
      testedPaths.push(path);
      try {
        await testChromeExecutable(path);
        logger(`✅ ${label} test passed: ${path}`, "info");
        return path;
      } catch (err) {
        logger(`❌ ${label} test failed: ${err.message}`, "warn");
      }
    }
    return null;
  };

  // 1. Environment variable
  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    const result = await tryPath(
      process.env.PUPPETEER_EXECUTABLE_PATH,
      "Env-specified path"
    );
    if (result) return result;
  }

  // 2. Auto-detection
  try {
    const autoPath = await getExecutablePath(puppeteer);
    if (autoPath) {
      const result = await tryPath(autoPath, "Auto-detected path");
      if (result) return result;
    }
  } catch (err) {
    logger(`⚠️ Auto-detection failed: ${err.message}`, "warn");
  }

  // 3. Production fallback
  if (isProduction) {
    const result = await tryPath(envExecPath, "Production fallback path");
    if (result) return result;

    throw new Error(
      `No working Chrome executable found. Tried: ${testedPaths.join(", ")}`
    );
  }

  logger(
    "⚠️ No custom Chrome found, Puppeteer will use bundled Chromium",
    "info"
  );
  return null;
}

export async function launchBrowser(headless = false) {
  try {
    if (!stealthApplied) {
      puppeteer.use(
        StealthPlugin({
          showConsole: true,
          blockAds: false,
          skipFrameBusting: true,
        })
      );
      stealthApplied = true;
    }

    const executablePath = await resolveAndTestChromePath();

    const launchOptions = {
      headless,
      args: commonLaunchArgs,
      timeout: 60000,
      ...(executablePath && { executablePath }),
    };

    logger("🚀 Launching browser...", "info");
    const browser = await puppeteer.launch(launchOptions);

    // Optional browser check
    try {
      const pages = await browser.pages();
      if (pages.length === 0) {
        const page = await browser.newPage();
        await page.close();
      }
    } catch (err) {
      logger(`⚠️ Browser verification failed: ${err.message}`, "warn");
    }

    logger(
      `✅ Browser launched${
        executablePath ? ` with: ${executablePath}` : " using Puppeteer default"
      }`,
      "info"
    );
    return browser;
  } catch (err) {
    logger(`❌ Browser launch failed: ${err.message}`, "error");
    return { isBrowserReady: false, error: err.message };
  }
}

export async function testChromeDetection() {
  try {
    const executablePath = await resolveAndTestChromePath();
    return {
      success: true,
      path: executablePath || "puppeteer-default",
      tested: true,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      tested: false,
    };
  }
}

export async function browserHealthCheck() {
  logger("🔍 Running browser health check...", "info");

  try {
    const testResult = await testChromeDetection();
    if (!testResult.success) {
      return { healthy: false, error: testResult.error };
    }

    const browser = await launchBrowser(true);
    if (browser.isBrowserReady === false) {
      return { healthy: false, error: browser.error };
    }

    const page = await browser.newPage();
    await page.goto("data:text/html,<title>Health Check</title>");
    const title = await page.evaluate(() => document.title);
    await page.close();
    await browser.close();

    logger("✅ Browser health check passed", "info");
    return {
      healthy: true,
      chromePath: testResult.path,
      tested: true,
    };
  } catch (err) {
    logger(`❌ Browser health check failed: ${err.message}`, "error");
    return { healthy: false, error: err.message };
  }
}
