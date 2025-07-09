import { justForAMoment, runSpinner } from "../utils/utilities.js";
import { API_CLIENT, displayLabel } from "./apiCallHandlers.js";

export async function validateSuperAdmin() {
  try {
    runSpinner(false, "validating...");

    const user = getAuthHandler();
    if (!user || !user["auth-token"]) {
      runSpinner(true);
      displayLabel([
        "review_main_wrapper",
        "alert-warning",
        "Session expired. You are not logged in.",
      ]);
      throw new Error("User not authenticated");
    }

    const { "auth-token": token, isAdmin, superUserToken, isSuperUser } = user;

    if (!token || !isSuperUser || !isAdmin) return false;

    if (user) {
      const apiClient = await API_CLIENT();

      const baseUrl = "/user/validate";

      const headers = {
        Authorization: `Bearer ${token}`,
        "admin-token": superUserToken,
        "Content-Type": "application/json",
      };

      const res = await apiClient.post(baseUrl, {}, { headers });
      if (res.status === 200 && res.statusText && res.data.state) {
        runSpinner(true);
        return true;
      }
      return false;
    }
  } catch (error) {
    if (
      error.response &&
      error.response.status === 403 &&
      error.response.data.status === "UNAUTHORIZED"
    ) {
      runSpinner(true);
      return displayLabel([
        "review_main_wrapper",
        "alert-warning",
        "Your session has expired.",
      ]);
    }
    if (error.message.includes("User not authenticated"))
      return runSpinner(true);

    console.warn(error);
  }
}
export function getAuthHandler() {
  try {
    const userString = sessionStorage.getItem("user");
    const user = userString ? JSON.parse(userString) : null;
    return user;
  } catch (e) {
    console.warn("Session storage access error:", e);
  }
}
export function setAuthHandler(userObject, headers) {
  if (userObject && headers && headers.authorization) {
    try {
      const authToken = headers.authorization.split(" ")[1];

      const userWithoutMeta = { ...userObject, "auth-token": authToken };

      sessionStorage.setItem("user", JSON.stringify(userWithoutMeta));

      return userWithoutMeta;
    } catch (error) {
      console.error("Error parsing authorization header:", error);
    }
  }
  return null;
}
export async function fetchCurrentUserUpdateSeesionStorage() {
  try {
    runSpinner(false, "Processing...");
    const user = getAuthHandler();
    const { "auth-token": token } = user;

    const baseUrl = `/get-user`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };
    const apiClient = await API_CLIENT();
    const response = await apiClient.post(baseUrl, {}, { headers });

    if (response.status === 200) {
      const authToken = headers.Authorization.split(" ")[1];
      const userWithoutMeta = { ...response.data, "auth-token": authToken };
      sessionStorage.setItem("user", JSON.stringify(userWithoutMeta));
      runSpinner(true);
      return response.data;
    }
  } catch (e) {
    console.log(e.message);
    if (e?.message?.includes("401")) return justForAMoment("Aborting...");
  }
}
