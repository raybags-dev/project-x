import "dotenv/config";
import fs from "fs";
import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { logger } from "../loggers/logger.js";
import { getExecutablePath } from "../utilities/chromiumExecPath.js";

const isProduction = process.env.NODE_ENV === "production";
const envExecPath = "/usr/bin/chromium"; // Production fallback

let stealthApplied = false;

async function testChromeExecutable(executablePath) {
  try {
    // Check if file exists
    if (!fs.existsSync(executablePath)) {
      throw new Error(`Chrome executable not found at: ${executablePath}`);
    }

    // Check if file is executable (Unix-like systems)
    try {
      await fs.promises.access(
        executablePath,
        fs.constants.F_OK | fs.constants.X_OK
      );
    } catch (accessError) {
      logger(
        `Warning: Chrome executable may not have proper permissions: ${executablePath}`,
        "warn"
      );
    }

    logger(`Testing Chrome executable: ${executablePath}`, "info");

    const testBrowser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-default-browser-check",
        "--disable-default-apps",
      ],
      timeout: 30000,
    });

    const testPage = await testBrowser.newPage();
    await testPage.goto("data:text/html,<h1>Test</h1>", {
      waitUntil: "domcontentloaded",
    });
    const title = await testPage.evaluate(
      () => document.querySelector("h1")?.textContent
    );

    await testPage.close();
    await testBrowser.close();

    if (title !== "Test") {
      throw new Error("Chrome test page failed to load properly");
    }

    logger(`✅ Chrome executable test passed: ${executablePath}`, "info");
    return true;
  } catch (error) {
    logger(`Chrome executable test failed: ${error.message}`, "error");
    throw error;
  }
}
async function resolveAndTestChromePath() {
  let executablePath;
  let pathSource;
  let testedPaths = [];

  if (process.env.PUPPETEER_EXECUTABLE_PATH) {
    const envPath = process.env.PUPPETEER_EXECUTABLE_PATH;
    logger(`Testing environment-specified Chrome path: ${envPath}`, "info");
    testedPaths.push(envPath);

    try {
      await testChromeExecutable(envPath);
      logger(`Environment Chrome path test passed: ${envPath}`, "info");
      return envPath;
    } catch (testError) {
      logger(
        `Environment Chrome path test failed: ${testError.message}`,
        "warn"
      );
    }
  }

  try {
    executablePath = await getExecutablePath(puppeteer);
    pathSource = "auto-detection";
    logger(`Auto-detected Chrome path: ${executablePath}`, "info");

    if (executablePath && !testedPaths.includes(executablePath)) {
      testedPaths.push(executablePath);
      try {
        await testChromeExecutable(executablePath);
        logger(
          `✅ Auto-detected Chrome path test passed: ${executablePath}`,
          "info"
        );
        return executablePath;
      } catch (testError) {
        logger(
          `Auto-detected Chrome path test failed: ${testError.message}`,
          "warn"
        );
      }
    }
  } catch (detectionError) {
    logger(`Chrome auto-detection failed: ${detectionError.message}`, "warn");
  }

  if (isProduction && !testedPaths.includes(envExecPath)) {
    logger(`Testing production fallback: ${envExecPath}`, "info");
    try {
      await testChromeExecutable(envExecPath);
      logger(`✅ Production fallback test passed: ${envExecPath}`, "info");
      return envExecPath;
    } catch (testError) {
      logger(`Production fallback test failed: ${testError.message}`, "error");
      throw new Error(
        `No working Chrome executable found in production. Tested: ${testedPaths.join(
          ", "
        )}`
      );
    }
  }

  logger(
    "No working Chrome found, letting Puppeteer use bundled Chromium",
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
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-features=IsolateOrigins,site-per-process",
        "--disable-http2",
        "--disable-blink-features=AutomationControlled",
        "--disable-dev-shm-usage", // Additional stability
        "--disable-gpu", // Helps in headless mode
        "--no-first-run",
        "--no-default-browser-check",
      ],
      timeout: 60000, // 60 second launch timeout
    };

    // Only set executablePath if we have one (let Puppeteer use default otherwise)
    if (executablePath) {
      launchOptions.executablePath = executablePath;
    }

    logger("Launching browser with tested configuration...", "info");
    const browser = await puppeteer.launch(launchOptions);

    // Additional verification that browser is working
    try {
      const pages = await browser.pages();
      if (pages.length === 0) {
        const testPage = await browser.newPage();
        await testPage.close();
      }
    } catch (verificationError) {
      logger(
        `Browser verification warning: ${verificationError.message}`,
        "warn"
      );
    }

    logger(
      `✅ Browser launched successfully${
        executablePath ? ` using: ${executablePath}` : " with Puppeteer default"
      }`,
      "info"
    );
    return browser;
  } catch (error) {
    logger(`Browser launch failed: ${error.message}`, "error");
    return { isBrowserReady: false, error: error.message };
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
  logger("Running browser health check...", "info");

  try {
    const testResult = await testChromeDetection();
    if (!testResult.success) {
      return { healthy: false, error: testResult.error };
    }

    const browser = await launchBrowser(true);
    if (browser.isBrowserReady === false) {
      return { healthy: false, error: browser.error };
    }

    // Quick functionality test
    const page = await browser.newPage();
    await page.goto("data:text/html,<h1>Health Check</h1>");
    const title = await page.evaluate(() => document.title);
    await page.close();
    await browser.close();

    logger("Browser health check passed", "info");
    return {
      healthy: true,
      chromePath: testResult.path,
      tested: true,
    };
  } catch (error) {
    logger(`Browser health check failed: ${error.message}`, "error");
    return { healthy: false, error: error.message };
  }
}
