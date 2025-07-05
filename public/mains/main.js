import { getAuthHandler } from "../components/auth.js";
import { LOGIN_HTML } from "../components/login.js";
import { MAIN_PAGE } from "../components/main_container.js";
import { PLUGINS } from "../utils/plugins.js";
const { handleCookieAcceptance } = PLUGINS;

const handleRuntimeError = (errorMessage) =>
  errorMessage?.includes("runtime.lastError");

window.addEventListener("error", (e) => {
  if (handleRuntimeError(e.message)) {
    e.preventDefault();
    return true;
  }
});

window.addEventListener("unhandledrejection", (e) => {
  if (handleRuntimeError(e.reason?.message)) {
    e.preventDefault();
  }
});

(async () => {
  try {
    if (!(await handleCookieAcceptance())) return;

    const user = await getAuthHandler();
    user?.isAdmin ? await MAIN_PAGE() : LOGIN_HTML();
  } catch (error) {
    console.error("Initialization error:", error);
  }
})();
