import fs from "fs";
import path from "path";

export function checkEnvFile(requiredKeys = ["MONGODB_URI"]) {
  const envPath = path.resolve(process.cwd(), ".env");

  if (!fs.existsSync(envPath)) {
    console.error(`> ❌ .env file is missing at: ${envPath}`);
    console.error(
      "> ❌ Please create a .env file with the required environment variables."
    );
    return;
  }

  const content = fs.readFileSync(envPath, "utf-8").trim();

  if (content.length === 0) {
    console.warn(`> ⚠️ .env file found at ${envPath}, but it is empty.`);
    console.warn(
      "> ⚠️ Please populate it with necessary environment variables."
    );
    return;
  }

  console.log(`✅ .env file found at: ${envPath}`);

  for (const key of requiredKeys) {
    if (!process.env[key]) {
      console.warn(`> ⚠️ Missing required environment variable: ${key}`);
    }
  }
}
export default function bindToContext(context) {
  if (typeof context !== "object" || context === null) {
    throw new TypeError("Context must be a non-null object");
  }

  Object.keys(context).forEach((key) => {
    if (typeof context[key] === "function") {
      try {
        context[key] = context[key].bind(context);
      } catch (error) {
        console.error(`Error binding method (${key}):`, error);
      }
    }
  });
}
