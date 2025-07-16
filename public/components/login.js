import {
  loginUser,
  saveLoginFormState,
} from "../components/apiCallHandlers.js";
import { setAuthHandler } from "../components/auth.js";
import { UPDATE_PASSWORD_HTML } from "../utils/update.js";
import { justForAMoment, runSpinner } from "../utils/utilities.js";
import { displayLabel } from "./apiCallHandlers.js";
import { MAIN_PAGE } from "./main_container.js";
import { SIGNUP_HTML } from "./signup.js";

async function handleLoginFormSubmit(event) {
  event.preventDefault();
  justForAMoment();

  const formData = new FormData(event.target);
  const email = formData.get("email");
  const password = formData.get("password");

  const LOGIN_ATTEMPTS_KEY = "login_attempted_emails";
  const maxAttempts = 3;

  const forgotCheckbox = document.querySelector("#flexSwitchCheckDefault");
  const isForgotMode = forgotCheckbox?.checked;

  if (isForgotMode) {
    const allowedEmails =
      JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY)) || [];
    if (!allowedEmails.includes(email)) {
      displayLabel([
        "review_main_wrapper",
        "alert-danger",
        "Only previously attempted emails can be used to reset the password.",
      ]);
      return;
    }
  }

  try {
    const loginResponse = await loginUser({ email, password });

    const resetMessage = loginResponse?.data?.message;
    if (
      loginResponse?.status === 200 &&
      resetMessage === "Password reset email sent."
    ) {
      displayLabel(["review_main_wrapper", "alert-success", resetMessage]);
      clearLoginFormState();
      restoreLoginFormState();
      setTimeout(() => {
        history.pushState(null, null, "/");
        UPDATE_PASSWORD_HTML(email);
      }, 1000);
      return;
    }

    if (loginResponse.status === 200) {
      // ✅ Save login email only for successful normal logins
      if (!isForgotMode) {
        let attemptedEmails =
          JSON.parse(localStorage.getItem(LOGIN_ATTEMPTS_KEY)) || [];
        attemptedEmails = [
          email,
          ...attemptedEmails.filter((e) => e !== email),
        ].slice(0, maxAttempts);
        localStorage.setItem(
          LOGIN_ATTEMPTS_KEY,
          JSON.stringify(attemptedEmails)
        );
      }

      justForAMoment("Almost done");
      const { user } = loginResponse.data;
      const { headers } = loginResponse;

      const userCreds = await setAuthHandler(user, headers);
      const { isAdmin } = userCreds;

      if (isAdmin) {
        sessionStorage.setItem("redirected", true);
        displayLabel([
          "review_main_wrapper",
          "alert-success",
          "Login was successful",
        ]);
        setTimeout(async () => {
          runSpinner(true);
          history.pushState(null, null, "/");

          const isDOMReady = await MAIN_PAGE();
          if (!isDOMReady) return false;
          return true;
        }, 800);
      }
    } else if (
      loginResponse.status === 429 &&
      loginResponse.statusText == "Too Many Requests"
    ) {
      displayLabel([
        "review_main_wrapper",
        "alert-danger",
        `Failed: ${loginResponse.data?.error}`,
      ]);
    } else {
      displayLabel([
        "review_main_wrapper",
        "alert-danger",
        "Login failed - Invalid user credentials",
      ]);
    }
  } catch (error) {
    runSpinner(false, "Failed!");
    const errorMessage = error?.response?.data?.error || "An error occurred.";
    displayLabel(["review_main_wrapper", "alert-danger", `${errorMessage}`]);
    setTimeout(() => runSpinner(true), 3000);
  }
}

function setupEventListeners() {
  const navbarBrand = document.querySelector("#to_sigup_p");
  navbarBrand?.addEventListener("click", async () => {
    SIGNUP_HTML();
  });
  const loginForm = document.querySelector("#login___form");
  loginForm?.addEventListener("submit", handleLoginFormSubmit);
}
export async function LOGIN_HTML() {
  let pageContent = `
  <nav class="navbar navbar-expand-lg shadow shadow-sm bg-light text-dark">
      <div class="container-fluid">
          <a class="navbar-brand p-2 mb-1" href="#">
              <img src="../images/logo.png" alt="" width=40" height="40" style="border-radius: 50%;filter: gray(100%)"
                  class="d-inline-block align-text-top">
          </a>
    
          <ul class="navbar-nav">
              <li class="nav-item">
                  <a id="to_sigup_p" class="nav-link active text-dark" aria-current="page" href="#">SIGNUP</a>
              </li>
          </ul>
      </div>
  </nav>
  <main id="review_main_wrapper" class="container container-fluid my-10">
    <div class="container log___in container-fluid shadow shadow-lg bg-light">
        <h3 class="p-2 text-dark ">LOGIN</h3>
        <form id="login___form" class=" p-3 rounded pt-2 text-dark container-fluid">
            <div class="mb-3 p-0">
                <label for="exampleInputEmail1" class="form-label">Email address</label>
                <input type="email" name="email" class="form-control shadow shadow-sm" placeholder="Enter your email"
                    id="exampleInputEmail1" aria-describedby="emailHelp" required>
                <div class="invalid-feedback">Please enter a valid email address.</div>
            </div>
            <div class="mb-3">
                  <label for="exampleInputPassword1" class="form-label">Password</label>
                  <input type="password" name="password" placeholder="Enter your password" class="form-control shadow shadow-sm"
                      id="exampleInputPassword1" autocomplete="current-password webauthn"  required>
                  <div class="invalid-feedback">Please enter your password.</div>
            </div>
            <div id="checker" class="form-check form-switch mt-3 mb-3 hide_2">
                      <input class="form-check-input shadow shadow"  type="checkbox" role="switch" id="flexSwitchCheckDefault">
                      <label class="form-check-label" for="flexSwitchCheckDefault">Forgot password</label>
            </div>
            
            <div class="_loginSub">
                <button type="submit"  class="btn btn-lg shadow shadow-lg btn-outline-success login_btn">SUBMIT</button>
            </div>
        </form>
    </div>
  </main>
      `;
  document.getElementById("innerBody").innerHTML = pageContent;
  setupEventListeners();
  restoreLoginFormState();
  setupLoginFormCheckboxBehavior();
}
export function restoreLoginFormState() {
  const STORAGE_KEY = "loginFormState";

  try {
    const savedState = localStorage.getItem(STORAGE_KEY);
    if (!savedState) return;

    const state = JSON.parse(savedState);

    // Restore forgot password section visibility
    if (state.forgotPasswordVisible || state.checkerDivVisible) {
      const checkerDiv = document.querySelector("#checker");
      if (checkerDiv) {
        checkerDiv.classList.remove("hide_2");
      }
    }

    // Restore checkbox state
    const forgotPasswordCheckbox = document.querySelector(
      "#flexSwitchCheckDefault"
    );
    if (forgotPasswordCheckbox && state.forgotPasswordChecked !== undefined) {
      forgotPasswordCheckbox.checked = state.forgotPasswordChecked;
    }

    // Restore password field state
    const passwordField = document.querySelector("#exampleInputPassword1");
    if (passwordField) {
      if (state.passwordFieldDisabled !== undefined) {
        passwordField.disabled = state.passwordFieldDisabled;
        passwordField.style.opacity = state.passwordFieldDisabled ? "0.6" : "1";
      }

      if (state.passwordFieldPlaceholder) {
        passwordField.placeholder = state.passwordFieldPlaceholder;
      }

      passwordField.value = "";
    }

    if (state.forgotPasswordVisible && forgotPasswordCheckbox) {
      if (!forgotPasswordCheckbox.hasAttribute("data-listener-added")) {
        forgotPasswordCheckbox.setAttribute("data-listener-added", "true");

        forgotPasswordCheckbox.addEventListener("change", function (event) {
          const emailField = document.querySelector("#exampleInputEmail1");

          const passwordField = document.querySelector(
            "#exampleInputPassword1"
          );

          if (event.target.checked) {
            if (passwordField && emailField) {
              // Lock input
              passwordField.disabled = true;
              emailField.disabled = true;

              // Get most recent attempted email
              const emailAttempts =
                JSON.parse(localStorage.getItem("login_attempted_emails")) ||
                [];
              const lockedEmail = emailAttempts[0] || "";

              emailField.value = lockedEmail;
              passwordField.placeholder = "Password reset mode enabled.";
              emailField.placeholder = `Using previous login: ${
                lockedEmail || "unknown"
              }`;

              passwordField.style.opacity = "0.6";
              emailField.style.opacity = "0.6";

              passwordField.value = "";
            }

            saveLoginFormState({
              forgotPasswordChecked: true,
              passwordFieldDisabled: true,
              passwordFieldPlaceholder: "Password reset mode enabled.",
            });
          } else {
            if (passwordField) {
              passwordField.disabled = false;
              passwordField.placeholder = "Enter your password";
              passwordField.style.opacity = "1";

              emailField.disabled = false;
              emailField.placeholder = `${emailField.value}`;
              emailField.style.opacity = "1";
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
  } catch (error) {
    console.log("Error restoring login form state:", error);
  }
}
export function clearLoginFormState() {
  const STORAGE_KEY = "loginFormState";
  try {
    localStorage.removeItem(STORAGE_KEY);

    const checkerDiv = document.querySelector("#checker");
    const forgotPasswordCheckbox = document.querySelector(
      "#flexSwitchCheckDefault"
    );
    const passwordField = document.querySelector("#exampleInputPassword1");

    if (checkerDiv) {
      checkerDiv.classList.add("hide_2");
    }

    // Reset checkbox state
    if (forgotPasswordCheckbox) {
      forgotPasswordCheckbox.checked = false;
      forgotPasswordCheckbox.removeAttribute("data-listener-added");
    }

    // Reset password field state
    if (passwordField) {
      passwordField.disabled = false;
      passwordField.placeholder = "Enter your password";
      passwordField.style.opacity = "1";
      passwordField.value = "";
    }
  } catch (error) {
    console.log("Error clearing login form state:", error);
  }
}
export function setupLoginFormCheckboxBehavior() {
  const form = document.querySelector("#login___form");
  if (!form) return;

  const checkboxContainer = document.querySelector("#checker");
  const checkbox = document.querySelector("#flexSwitchCheckDefault");
  const submitBtn = form.querySelector(".login_btn");

  if (!checkbox || !submitBtn) return;

  function updateButtonState() {
    const checkboxVisible = !checkboxContainer.classList.contains("hide_2");
    const isChecked = checkbox.checked;

    if (checkboxVisible) {
      submitBtn.textContent = "GET NEW PASSWORD";
      submitBtn.disabled = !isChecked;
    } else {
      submitBtn.textContent = "SUBMIT";
      submitBtn.disabled = false;
    }
  }

  const observer = new MutationObserver(() => {
    updateButtonState();
  });

  observer.observe(checkboxContainer, {
    attributes: true,
    attributeFilter: ["class"],
  });

  updateButtonState();
  checkbox.addEventListener("change", updateButtonState);
}
