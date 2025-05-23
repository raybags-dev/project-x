import "dotenv/config";

export function validateAutomationContextVars() {
  const requiredVars = [
    "CONTEXT_USER_TOKEN",
    "CONTEXT_USER_ID",
    "CONTEXT_USER_EMAIL",
    "CONTEXT_USER_ELEVATED_STATUS",
    "CONTEXT_USERID",
  ];

  const missing = requiredVars.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required .env variables for automation context: ${missing.join(
        ", "
      )}`
    );
  }
}
