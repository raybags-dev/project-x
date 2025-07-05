import {
  clearProfileForm,
  removeElementFromDOM,
  runSpinner,
  shakeAnimation,
  validateSlug,
} from "../utils/utilities.js";
import {
  fetchCurrentUserUpdateSeesionStorage,
  getAuthHandler,
  setAuthHandler,
} from "./auth.js";
import {
  LOGIN_HTML,
  clearLoginFormState,
  restoreLoginFormState,
} from "./login.js";

export async function API_CLIENT() {
  const apiClient = axios.create({
    baseURL: "/raybags/v1/review-crawler",
    timeout: 150000,
  });

  apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response) {
        const { status, data } = error.response;
        if (status === 401) {
          sessionStorage.removeItem("user");
          sessionStorage.removeItem("redirected");
          displayLabel([
            "review_main_wrapper",
            "alert-danger",
            `Your session has expired. Please login again!`,
          ]);
          runSpinner(false, "Aborting...");
        }
      }
      return Promise.reject(error);
    }
  );
  return apiClient;
}
export async function loginUser(user) {
  if (!user || !user.email) {
    displayLabel(["review_main_wrapper", "alert-danger", "Email is required."]);
    console.error("Invalid user or credentials");
    return null;
  }

  const forgotPasswordCheckbox = document.querySelector(
    "#flexSwitchCheckDefault"
  );
  const checkboxContainer = document.querySelector("#checker");

  const isForgotPasswordMode =
    forgotPasswordCheckbox &&
    !checkboxContainer.classList.contains("hide_2") &&
    forgotPasswordCheckbox.checked;

  const url = isForgotPasswordMode ? "/user/forgot-password" : "/user/login";

  try {
    runSpinner(
      false,
      isForgotPasswordMode ? "Requesting reset..." : "Almost there"
    );
    const apiClient = await API_CLIENT();

    const payload = isForgotPasswordMode
      ? { email: user.email }
      : { email: user.email, password: user.password };

    const response = await apiClient.post(url, payload);
    const { headers, status, data } = response;

    if (status === 200) {
      runSpinner(true);

      if (isForgotPasswordMode) {
        displayLabel([
          "review_main_wrapper",
          "alert-success",
          "Password reset link sent to your email.",
        ]);
        clearLoginFormState();
        restoreLoginFormState();
        return response;
      }

      // Proceed with login flow
      const { user: userData } = data;
      await setAuthHandler(userData, headers);
      sessionStorage.setItem("redirected", true);
      displayLabel([
        "review_main_wrapper",
        "alert-success",
        "Login successful.",
      ]);
      loginErrorTracker(false);
      clearLoginFormState();
      return response;
    }

    displayLabel([
      "review_main_wrapper",
      "alert-danger",
      "Something went wrong. Try again.",
    ]);
    return response;
  } catch (error) {
    runSpinner(false, "Failed!");

    const isUnauthorized =
      error.response?.status === 401 &&
      error.response?.statusText?.includes("Unauthorized");

    if (isUnauthorized && !isForgotPasswordMode) {
      displayLabel([
        "review_main_wrapper",
        "alert-danger",
        "Your account could not be found! Please register.",
      ]);
      loginErrorTracker(true);
    }

    displayLabel([
      "review_main_wrapper",
      "alert-danger",
      isForgotPasswordMode
        ? "Could not send reset link. Please try again."
        : "Login failed. Please try again.",
    ]);

    setTimeout(() => runSpinner(true), 3000);
    return error?.response;
  }
}
export async function logOutUser(selector) {
  const cookieRef = await handleCookieAcceptance();
  if (!cookieRef) return;

  const BTNs = Array.from(document.querySelectorAll(selector));

  if (BTNs.length) {
    BTNs.forEach(async (btn) => {
      btn.addEventListener("click", async () => {
        const user = sessionStorage.getItem("user");
        if (user) {
          displayLabel([
            "review_main_wrapper",
            "alert-secondary",
            "Logout successful!",
          ]);

          setTimeout(() => {
            sessionStorage.removeItem("user");
            sessionStorage.removeItem("redirected");
          }, 500);
        }
        LOGIN_HTML();
      });
    });
  }
}
export async function displayLabel([anchorId, labelClass, labelText]) {
  const existingAlert = document.querySelector(".main___alert");
  if (existingAlert) {
    existingAlert.remove();
  }
  const label = document.createElement("div");
  label.classList.add("alert", labelClass, "text-center", "main___alert");
  label.textContent = labelText;
  label.style.zIndex = 5000;

  const anchor = document.getElementById(anchorId);
  if (anchor) {
    anchor.appendChild(label);
    setTimeout(() => {
      if (anchor.contains(label)) {
        anchor.removeChild(label);
      }
    }, 10000);
  } else {
    console.log(`Anchor with ID '${anchorId}' could not be found`);
  }
}
export async function sendCreateProfileRequest() {
  let slug = "";
  const user = getAuthHandler();
  if (!user) return;
  const { "auth-token": token, isAdmin, _id } = user;

  try {
    const formData = new FormData();

    if (!isAdmin || !token) {
      displayLabel(["main__wrapper", "alert-danger", "Unauthorized!"]);
      return;
    }

    if (token && isAdmin) {
      const apiClient = await API_CLIENT();

      const defaultValue = "Choose site";
      const siteOptions = document.getElementById("inputGroupSiteOptions");
      const selectedOption = siteOptions.querySelector("option:checked");

      if (selectedOption.value === defaultValue) {
        displayLabel([
          "review_main_wrapper",
          "alert-warning",
          "Please select a review-site name to create a profile!",
        ]);
        return;
      }

      const siteUrl = document.querySelector("#propertUrlInputY").value.trim();

      if (!siteUrl.length) {
        displayLabel([
          "review_main_wrapper",
          "alert-warning",
          "Property URL is missing. URL is required for this operation!",
        ]);
        return;
      }

      const urlRegex = /^(https?:\/\/(www\.)?|www\.)\S*$/;
      if (!urlRegex.test(siteUrl)) {
        displayLabel([
          "review_main_wrapper",
          "alert-danger",
          "Invalid URL format. Please provide a valid URL!",
        ]);
        return;
      }

      runSpinner(false, "Creating...");

      formData.append("frontFacingUrl", siteUrl);
      slug = selectedOption ? selectedOption.value : "";
      const urlPart = slug ? `create-${slug}-review-profile` : "";
      const baseUrl = `/user/${urlPart}`;

      const isValidRequest = validateSlug(slug, siteUrl);

      if (!isValidRequest) {
        shakeAnimation("#uploadForm");
        return clearProfileForm();
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const res = await apiClient.post(baseUrl, formData, { headers });
      runSpinner(true);

      if (res.status === 200) {
        removeElementFromDOM("#uploadForm");
        displayLabel([
          "review_main_wrapper",
          "alert-success",
          `${slug} profile created successfully.`,
        ]);
        setTimeout(() => {
          runSpinner(false);
          displayLabel([
            "review_main_wrapper",
            "alert-success",
            `${slug} review collection in progress...`,
          ]);
        }, 2000);
        const response = await fetchReviewSiteProfile(_id, slug);

        if (response.status === 200) {
          //update localsession
          await fetchCurrentUserUpdateSeesionStorage();
          const data = await response.data;
          if (data.length) {
            await runCrawlerHandler(slug);
          }
        }
      } else {
        setTimeout(() => {
          runSpinner(true, "Failed!");
          displayLabel([
            "review_main_wrapper",
            "alert-warn",
            `Request could not be fulfilled! Please try again later.`,
          ]);
        }, 2000);
      }
    }
  } catch (error) {
    const { response } = error;

    if (response) {
      const { status, data } = response;

      // Handle "User is unsubscribed" error
      if (
        status === 400 &&
        (data.message.includes("user is unsubscribed") ||
          data.message.includes("requires active subscription"))
      ) {
        removeElementFromDOM("#uploadForm");
        runSpinner(true);
        displayLabel([
          "review_main_wrapper",
          "alert-warning",
          `Your account is innactive - Contact raymond baguma.github@gmail.com to activate your subscription`,
        ]);
        setTimeout(() => location.reload(), 5000);
        return;
      }

      if (status === 400) {
        removeElementFromDOM("#uploadForm");
        runSpinner(true);
        if (data.message.includes("requires active subscription"))
          return displayLabel([
            "review_main_wrapper",
            "alert-warning",
            `Active subscription is required to create a ${slug} profile!`,
          ]);
        displayLabel([
          "review_main_wrapper",
          "alert-warning",
          `Failed to create ${slug} profile!`,
        ]);
        runSpinner("Running...");
        await runCrawlerHandler(slug);
        runSpinner(true);
      }
    }
  } finally {
    runSpinner(true);
  }
}
export async function fetchReviewSiteProfile(user_id, slug) {
  runSpinner(false);
  if (!user_id) {
    runSpinner(true);
    return displayLabel([
      "review_main_wrapper",
      "alert-danger",
      `Invalid request!`,
    ]);
  }

  try {
    runSpinner(false, "Processing...");
    const user = getAuthHandler();
    const { "auth-token": token } = user;

    const baseUrl = `/user/get-profile/${user_id}?slug=${slug}-com`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const apiClient = await API_CLIENT();
    const response = await apiClient.post(baseUrl, {}, { headers });

    if (response.status === 200) {
      runSpinner(true);
      const profile = await response;
      return profile;
    }
    return null;
  } catch (e) {
    console.log(e.message);
    displayLabel([
      "review_main_wrapper",
      "alert-danger",
      `Error collecting profile ${e.message} `,
    ]);
  }
}
export async function runCrawlerHandler(slug, depth = 5) {
  if (!slug) return;
  runSpinner(false, "Crawling...");

  try {
    const user = getAuthHandler();
    if (user) {
      const apiClient = await API_CLIENT();

      const { "auth-token": token, isSubscribed, userProfiles } = user;

      userProfiles &&
        userProfiles.forEach((profile) => {
          if (depth == "full" && profile?.reviewSiteSlug == slug)
            depth = profile.propertyReviewCount;
        });

      const baseUrl = `/user/generate-${slug}-reviews`;
      const query = `?depth=${depth}`;

      if (!isSubscribed) {
        setTimeout(
          () =>
            displayLabel([
              "review_main_wrapper",
              "alert-warning",
              "Subscription innactive - Please contact admin to to activate your subscription!",
            ]),
          4000
        );
        await profileGenerator();
        return false;
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
      const url = `${baseUrl}${query}`;
      const res = await apiClient.post(url, {}, { headers });

      removeElementFromDOM("#uploadForm");

      if (res.status === 200) {
        displayLabel([
          "review_main_wrapper",
          "alert-success",
          `Review data has been collected successfully!`,
        ]);
        setTimeout(() => location.reload(), 2000);
      } else if (res.status === 404) {
        runSpinner(true, "Failed!");
        displayLabel([
          "review_main_wrapper",
          "alert-warning",
          `Someting went wrong: ${slug} review collection process failed!`,
        ]);
      } else {
        displayLabel([
          "review_main_wrapper",
          "alert-warning",
          `Someting went wrong: Review data could not be collected!`,
        ]);
        setTimeout(() => location.reload(), 2000);
      }
    }
  } catch (e) {
    if (
      e &&
      e.response &&
      e.response.error &&
      e.response.error.status === 503
    ) {
      displayLabel([
        "review_main_wrapper",
        "alert-danger",
        `Service unavailable, please try again later ${e.message}`,
      ]);
      runSpinner(true);
      return;
    }
    const isNotSubscribed =
      e?.response?.status === 403 &&
      e?.response?.data?.message == "trial period expired";
    const message =
      "Subscription innactive - Please contact admin to to activate your subscription!";
    if (isNotSubscribed) {
      runSpinner(false, "Failed");
      await displayLabel(["review_main_wrapper", "alert-warning", message]);
    }
  }
}
export async function handleProfileGenerator(selector = null, hasData = true) {
  const anchor = document.querySelector(selector);
  if (anchor) {
    anchor.addEventListener("click", async () => {
      return await profileGenerator();
    });
  }
  if (!hasData) {
    return await profileGenerator();
  }
  document.addEventListener("click", (e) => {
    const target = e.target;
    const form = document.getElementById("uploadForm");
    const profileLink = document.querySelector(".create_profile");

    if (
      form &&
      !form.contains(target) &&
      !(profileLink && profileLink.contains(target))
    ) {
      form.remove();
    }
  });
}
export function loginErrorTracker(isLoginFailed) {
  const STORAGE_KEY = "loginFailedCount";
  const MAX_FAILED_ATTEMPTS = 3;
  const MAX_COUNTER_LIMIT = 5;

  if (isLoginFailed) {
    let currentCount = parseInt(localStorage.getItem(STORAGE_KEY) || "0");

    if (currentCount < MAX_COUNTER_LIMIT) {
      currentCount += 1;
      localStorage.setItem(STORAGE_KEY, currentCount.toString());
    }

    if (currentCount >= MAX_FAILED_ATTEMPTS) {
      showForgotPasswordOption();
    }
  } else {
    localStorage.removeItem(STORAGE_KEY);
  }
}
function showForgotPasswordOption() {
  const checkerDiv = document.querySelector("#checker");
  const forgotPasswordCheckbox = document.querySelector(
    "#flexSwitchCheckDefault"
  );

  if (checkerDiv && forgotPasswordCheckbox) {
    checkerDiv.classList.remove("hide_2");

    saveLoginFormState({
      forgotPasswordVisible: true,
      checkerDivVisible: true,
    });

    if (!forgotPasswordCheckbox.hasAttribute("data-listener-added")) {
      forgotPasswordCheckbox.setAttribute("data-listener-added", "true");
      forgotPasswordCheckbox.addEventListener("change", function (event) {
        const passwordField = document.querySelector("#exampleInputPassword1");

        if (event.target.checked) {
          if (passwordField) {
            passwordField.disabled = true;
            passwordField.placeholder =
              "Password reset mode enabled. Submit your request, check your email and follow the instructions.";
            passwordField.style.opacity = "0.6";
            passwordField.value = "";
          }

          saveLoginFormState({
            forgotPasswordChecked: true,
            passwordFieldDisabled: true,
            passwordFieldPlaceholder:
              "Password reset mode enabled. Submit your request, check your email and follow the instructions.",
          });
        } else {
          if (passwordField) {
            passwordField.disabled = false;
            passwordField.placeholder = "Enter your password";
            passwordField.style.opacity = "1";
          }

          saveLoginFormState({
            forgotPasswordChecked: false,
            passwordFieldDisabled: false,
            passwordFieldPlaceholder: "Enter your password",
          });
        }
      });
    }
  }
}
export function saveLoginFormState(stateUpdates) {
  const STORAGE_KEY = "loginFormState";

  try {
    const existingState = localStorage.getItem(STORAGE_KEY);
    const currentState = existingState ? JSON.parse(existingState) : {};

    const updatedState = { ...currentState, ...stateUpdates };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedState));
  } catch (error) {
    console.log("Error saving login form state:", error);
  }
}
export async function profileGenerator(options = {}) {
  let formIsPresent = document.querySelector("#uploadForm");
  if (formIsPresent) {
    formIsPresent.remove();
  }

  const container = document.querySelector("#review_main_wrapper");

  const uploadHTML = `
    <form id="uploadForm" class="select-img-form shadow shadow-lg rounded bg-light text-danger profile_form">
      <div class="input-group mb3 input-group-lg my_inputs">
        <select class="form-select border-transparent bg-light" id="inputGroupSiteOptions" aria-label="Example select with button addon">
          <!-- Options will be inserted here -->
        </select>
        <button class="btn btn-lg btn-outline-success rounded shadow shadow-sm sub__this_form" type="button" id="proertyName29">Submit</button>
      </div>

      <div class="input-group mb3 my_inputs">
        <textarea type="text" name="propertyurl" id="propertUrlInputY" placeholder="Paste your property review page link here... " rows="10" class="form-control" aria-label="propertyUrl"></textarea>
      </div>
    </form>
  `;

  container?.insertAdjacentHTML("afterbegin", uploadHTML);

  const selectElem = document.querySelector("#inputGroupSiteOptions");

  // Get slugs from localStorage
  let slugs = [];
  try {
    const raw = localStorage.getItem("slugs");
    const parsed = raw ? JSON.parse(raw) : null;
    slugs = Array.isArray(parsed?.slugs) ? parsed.slugs : [];
  } catch (e) {
    console.warn("Failed to parse slugs from localStorage", e);
  }

  // Determine active slug (e.g., "trip" -> "trip-com")
  let activeOption = null;
  if (options.active_site) {
    const match = slugs.find((slug) =>
      slug.startsWith(options.active_site + "-")
    );
    if (match) {
      activeOption = {
        value: options.active_site,
        text: match,
      };
    }
  }

  // Inject the default or active selected option
  const defaultOption = document.createElement("option");
  defaultOption.selected = true;
  defaultOption.disabled = false;
  defaultOption.value = activeOption ? activeOption.value : "";
  defaultOption.textContent = activeOption ? activeOption.text : "Choose site";
  selectElem.appendChild(defaultOption);

  // Inject the rest of the options
  slugs.forEach((slug) => {
    const val = slug.split("-")[0];
    const isActive = activeOption && val === activeOption.value;
    if (!isActive) {
      const option = document.createElement("option");
      option.value = val;
      option.textContent = slug;
      selectElem.appendChild(option);
    }
  });

  // Submit and keyboard listeners
  const submitBtn = document.querySelector(".sub__this_form");
  submitBtn?.addEventListener("click", async () => {
    await sendCreateProfileRequest();
  });

  document.addEventListener("keydown", async (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      await sendCreateProfileRequest();
    }
  });
}
export async function handleCookieAcceptance() {
  try {
    const isCookiesAccepted = localStorage.getItem("isCookiesAccepted");

    if (isCookiesAccepted === "false" || isCookiesAccepted === null) {
      const modalHTML = `
          <div class="modal fade text-dark bg-light" id="cookieModal"  data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="cookieModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-light shadow">
              <div class="modal-header border-0" >
                <h1 class="modal-title fs-5 text-dark m-auto text-uppercase text-muted" id="cookieModalLabel">Cookie Policy</h1>
              </div>
              <div class="modal-body">
                <p class="text-dark lead text-muted">This website uses cookies to enhance the user experience. By accepting cookies, you agree to our <a href="#" class="text-primary">Terms of Service</a> and <a href="#" class="text-primary">Privacy Policy</a>.</p>
              </div>
              <div class="container border-0 d-flex justify-content-around align-content-center gap-2 p-2">
                <button type="button" class="btn btn-lg btn-outline-secondary w-50" id="rejectCookies" data-bs-dismiss="modal">Reject</button>
                <button type="button" class="btn btn-lg btn-outline-success w-50" id="acceptCookies">Accept</button>
              </div>
            </div>
          </div>
        </div>
      `;

      document.body.insertAdjacentHTML("beforeend", modalHTML);
      const cookieModal = new bootstrap.Modal(
        document.getElementById("cookieModal")
      );
      cookieModal.show();

      document.getElementById("acceptCookies").addEventListener("click", () => {
        localStorage.setItem("isCookiesAccepted", "true");
        localStorage.setItem("userGuideShown", "false");
        cookieModal.hide();
        window.location.reload();
      });

      document.getElementById("rejectCookies").addEventListener("click", () => {
        localStorage.setItem("isCookiesAccepted", "false");
        displayLabel([
          "body",
          "alert-danger",
          "Unfortunately, you can't use this application without consenting to the Terms of Service.",
        ]);

        cookieModal.hide();
        setTimeout(() => window.location.reload(), 5000);
      });

      document.querySelector(".c--iie-c-btn")?.addEventListener("click", () => {
        localStorage.setItem("isCookiesAccepted", "false");
        displayLabel([
          "body",
          "alert-danger",
          "Unfortunately, you can't use this application without consenting to the Terms of Service.",
        ]);
        cookieModal.hide();
        setTimeout(() => window.location.reload(), 5000);
      });
    }
    return localStorage.getItem("isCookiesAccepted") === "true";
  } catch (e) {
    console.log(e);
  }
}
