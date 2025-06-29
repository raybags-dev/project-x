import { API_CLIENT, displayLabel } from "../components/apiCallHandlers.js";
import { LOGIN_HTML } from "../components/login.js";
import { runSpinner } from "./utilities.js";

export async function UPDATE_PASSWORD_HTML(email) {
  let pageContent = `
    <nav class="navbar navbar-expand-lg shadow shadow-sm bg-light text-dark">
        <div class="container-fluid">
            <a class="navbar-brand p-2 mb-1" href="#">
                <img src="../images/logo.png" alt="" width=40" height="40" style="border-radius: 50%;filter: gray(100%)"
                    class="d-inline-block align-text-top">
            </a>
      
            <ul class="navbar-nav">
                <li class="nav-item">
                    <a id="to_login_p" class="nav-link active text-dark" aria-current="page" href="#">LOGIN</a>
                </li>
            </ul>
        </div>
    </nav>
    <main id="review_main_wrapper" class="container container-fluid my-10">
      <div class="container update___password container-fluid shadow shadow-lg bg-light">
          <h3 class="p-2 text-dark">UPDATE PASSWORD</h3>
          <form id="update_password_form" class="p-3 rounded pt-2 text-dark container-fluid">
              <div class="mb-3 p-0">
                  <label for="userInputEmail" class="form-label">Email address</label>
                  <input type="email" name="email" class="form-control shadow shadow-sm" placeholder="Enter your email" value="${
                    email || ""
                  }"
                      id="userInputEmail" aria-describedby="emailHelp" required>
                  <div class="invalid-feedback">Please enter a valid email address.</div>
              </div>
              <div class="mb-3">
                  <label for="exampleInputPassword1" class="form-label">New password</label>
                  <input type="password" name="new_password" placeholder="Type your new password" class="form-control shadow shadow-sm"
                      id="exampleInputPassword1" autocomplete="current-password webauthn" required>
                  <div class="invalid-feedback">Please enter your new password.</div>
              </div>
              <div class="mb-3">
                    <label for="vericationTokenX" class="form-label">Verification token</label>
                    <input type="text" name="verification_token" placeholder="Paste verification token here" class="form-control shadow shadow-sm"
                        id="vericationTokenX" required>
                    <div class="invalid-feedback">Verification token you received in your email is required!</div>
              </div>
              <div>
                  <button type="submit" class="btn btn-lg shadow shadow-lg btn-outline-success login_btn">SUBMIT</button>
              </div>
          </form>
      </div>
    </main>
        `;
  document.getElementById("innerBody").innerHTML = pageContent;

  const navbarBrand = document.querySelector("#to_login_p");
  navbarBrand?.addEventListener("click", async () => {
    LOGIN_HTML();
  });

  const updatePasswordForm = document.querySelector("#update_password_form");

  updatePasswordForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    runSpinner(false, "Updating...");

    const formData = new FormData(updatePasswordForm);
    const password = formData.get("new_password");
    const verification_token = formData.get("verification_token");
    const email = formData.get("email");

    try {
      let url = "/user/update/password";
      const payload = {
        email,
        password,
        verification_token,
      };

      const apiClient = await API_CLIENT();
      const response = await apiClient.post(url, payload);
      setTimeout(() => runSpinner(false, "..."), 800);

      if (response.status == 200) {
        runSpinner(false, "Success!");
        displayLabel([
          "review_main_wrapper",
          "alert-success",
          "Login successful.",
        ]);

        setTimeout(async () => {
          await LOGIN_HTML();
        }, 800);
      }
    } catch (error) {
      console.log("Error:", error);
      displayLabel(["review_main_wrapper", "alert-danger", "Process failed"]);
      runSpinner(false, "Unccessful!");
    }
    setTimeout(() => runSpinner(true), 800);
  });
}
