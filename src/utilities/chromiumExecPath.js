import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";

function isWSL() {
  return os.platform() === "linux" && fs.existsSync("/mnt/c/Windows");
}
function isWindows() {
  return os.platform() === "win32";
}
function isMacOS() {
  return os.platform() === "darwin";
}
function isLinux() {
  return os.platform() === "linux" && !isWSL();
}
function safeExistsSync(filePath) {
  try {
    return fs.existsSync(filePath);
  } catch (error) {
    return false;
  }
}
function tryCommand(command) {
  try {
    const result = execSync(command, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 5000,
    }).trim();
    return result && safeExistsSync(result) ? result : null;
  } catch (error) {
    return null;
  }
}
function getWindowsChromePaths() {
  const basePaths = [
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ];

  // Try user-specific installations
  const userProfile = process.env.USERPROFILE;
  if (userProfile) {
    basePaths.push(
      path.join(
        userProfile,
        "AppData\\Local\\Google\\Chrome\\Application\\chrome.exe"
      ),
      path.join(
        userProfile,
        "AppData\\Local\\Google\\Chrome SxS\\Application\\chrome.exe"
      ) // Chrome Canary
    );
  }

  return basePaths;
}
function getMacOSChromePaths() {
  const homeDir = os.homedir();
  return [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    path.join(
      homeDir,
      "Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    ),
    "/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary",
    path.join(
      homeDir,
      "Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary"
    ),
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
  ];
}
function getLinuxChromePaths() {
  return [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
    "/usr/local/bin/google-chrome",
    "/opt/google/chrome/chrome",
  ];
}
function getWSLChromePaths() {
  const basePaths = [
    "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe",
    "/mnt/c/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  ];

  try {
    const windowsUser = execSync('cmd.exe /c "echo %USERNAME%"', {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    if (windowsUser) {
      basePaths.push(
        `/mnt/c/Users/${windowsUser}/AppData/Local/Google/Chrome/Application/chrome.exe`,
        `/mnt/c/Users/${windowsUser}/AppData/Local/Google/Chrome SxS/Application/chrome.exe`
      );
    }
  } catch (error) {
    console.warn("Failed to get Windows user profile:", error.message);
  }

  return basePaths;
}
function findChromeByCommand() {
  const commands = [];

  if (isWindows()) {
    // Windows registry lookup
    commands.push(
      'reg query "HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve 2>nul'
    );
    commands.push(
      'reg query "HKEY_CURRENT_USER\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\App Paths\\chrome.exe" /ve 2>nul'
    );
  } else if (isMacOS()) {
    commands.push(
      "mdfind \"kMDItemCFBundleIdentifier == 'com.google.Chrome'\" 2>/dev/null"
    );
  } else if (isLinux()) {
    commands.push("which google-chrome-stable");
    commands.push("which google-chrome");
    commands.push("which chromium-browser");
    commands.push("which chromium");
  }

  for (const cmd of commands) {
    const result = tryCommand(cmd);
    if (result) {
      // Handle Windows registry output
      if (isWindows() && result.includes("REG_SZ")) {
        const match = result.match(/REG_SZ\s+(.+)/);
        if (match && match[1]) {
          const exePath = match[1].trim().replace(/"/g, "");
          if (safeExistsSync(exePath)) return exePath;
        }
      } else if (result.includes(".app")) {
        // macOS app bundle - convert to executable path
        const execPath = path.join(result, "Contents/MacOS/Google Chrome");
        if (safeExistsSync(execPath)) return execPath;
      } else {
        return result;
      }
    }
  }

  return null;
}
function getChromePath() {
  let searchPaths = [];

  // Determine platform-specific paths
  if (isWSL()) {
    searchPaths = getWSLChromePaths();
  } else if (isWindows()) {
    searchPaths = getWindowsChromePaths();
  } else if (isMacOS()) {
    searchPaths = getMacOSChromePaths();
  } else if (isLinux()) {
    searchPaths = getLinuxChromePaths();
  }

  // First, try direct path checking
  for (const chromePath of searchPaths) {
    if (safeExistsSync(chromePath)) {
      return chromePath;
    }
  }
  const commandResult = findChromeByCommand();
  if (commandResult) {
    return commandResult;
  }

  return null;
}
export async function getExecutablePath(puppeteer) {
  try {
    const chromePath = getChromePath();

    if (chromePath) {
      return chromePath;
    }

    // Fallback to Puppeteer's bundled Chromium
    if (puppeteer && puppeteer.createBrowserFetcher) {
      const browserFetcher = puppeteer.createBrowserFetcher();
      const localRevisions = await browserFetcher.localRevisions();

      if (localRevisions.length > 0) {
        const revisionInfo = browserFetcher.revisionInfo(localRevisions[0]);
        if (safeExistsSync(revisionInfo.executablePath)) {
          return revisionInfo.executablePath;
        }
      }
    }

    // Final fallback: try Puppeteer's default executable path
    if (puppeteer && puppeteer.executablePath) {
      try {
        const defaultPath = puppeteer.executablePath();
        if (defaultPath && safeExistsSync(defaultPath)) {
          return defaultPath;
        }
      } catch (error) {
        // Ignore error, continue to throw below
      }
    }

    throw new Error(
      "No Chrome installation found. Please install Google Chrome or ensure Puppeteer's bundled Chromium is available."
    );
  } catch (error) {
    if (error.message.includes("No Chrome installation found")) {
      throw error;
    }
    throw new Error(`Failed to detect Chrome executable: ${error.message}`);
  }
}
export { getChromePath, isLinux, isMacOS, isWindows, isWSL };
