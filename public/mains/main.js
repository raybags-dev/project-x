import { getAuthHandler } from "../components/auth.js";
import { LOGIN_HTML } from "../components/login.js";
import { MAIN_PAGE } from "../components/main_container.js";
import { PLUGINS } from "../utils/plugins.js";
const { handleCookieAcceptance } = PLUGINS;

window.addEventListener("error", function (e) {
  if (e.message && e.message.includes("runtime.lastError")) {
    e.preventDefault();
    return true;
  }
});

window.addEventListener("unhandledrejection", function (e) {
  if (
    e.reason &&
    e.reason.message &&
    e.reason.message.includes("runtime.lastError")
  ) {
    e.preventDefault();
  }
});

const DOMWorker = async () => {
  const cookieConcent = await handleCookieAcceptance();
  if (!cookieConcent) return;

  try {
    const user = await getAuthHandler();
    if (user?.isAdmin) return await MAIN_PAGE();
    LOGIN_HTML();
  } catch (error) {
    console.log((error.message && error.message) || error);
  }
};
DOMWorker();
