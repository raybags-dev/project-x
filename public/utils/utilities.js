import { API_CLIENT, displayLabel } from "../components/apiCallHandlers.js";
import { getAuthHandler } from "../components/auth.js";
import { siteLogos } from "../components/logoPaths.js";

export async function runSpinner(isDone, message = "") {
  const loader = document.querySelector("#main-page-loader");
  if (!isDone) {
    if (!loader) {
      const loaderHTML = `
            <div id="main-page-loader" class="d-flex align-items-center text-dark justify-content-center"
              style="position:fixed; top:0; left:0; right:0; bottom:0;z-index:3000; backdrop-filter:blur(2px);">
              <div class="d-flex">
                <p class="fs-4" id="my_text" style="position:absolute;top:50%;opacity:.8;left:50%;transform:translate(-50%, -50%);">
                  ${message ? (message = "⌛") : "⌛"}
                </p>
                <span class="loader text-dark" style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);zindex:1000;"></span>
              </div>
            </div>
          `;
      const wrapper = document.querySelector("body");
      wrapper.insertAdjacentHTML("beforeend", loaderHTML);
    }
  } else {
    if (loader) {
      loader.remove();
    }
  }
}
export async function confirmAction(containerId, message) {
  if (message === undefined || null)
    message = `This action cannot be reversed. Are you sure you want to proceed?`;
  return new Promise((resolve) => {
    const modalHTML = `
      <div class="modal fade border-2 border-danger p-1" style="backdrop-filter: blur(15px) !important;" id="exampleModalToggle" aria-labelledby="exampleModalToggleLabel" tabindex="-1">
        <div class="modal-dialog modal-dialog-centered">
          <div class="modal-content shadow shadow-lg rounded bg-light-custom text-dark">
            <div class="container text-center d-flex justify-content-center align-content-center text-uppercase p-2">
              <h1 class="modal-title fs-5 text-danger" id="exampleModalToggleLabel">Danger zone</h1>
            </div>
            <div class="modal-body">${message}</div>
            <div class="container bg-light mb-2 d-flex justify-content-around align-content-center gap-2">
              <button type="button" class="btn-lg btn-outline-danger shadow shadow-lg rounded w-50 proceed_delete overflow-hidden">Proceed</button>
              <button type="button" class="btn-lg btn-outline-success shadow shadow-lg rounded w-50 cancel_delete overflow-hidden">Cancel</button>
            </div>
          </div>
        </div>
      </div>
      <a class="btn btn-transparent" id="modalToggleButton" data-bs-toggle="modal" href="#exampleModalToggle" role="button" style="display:none;"></a>`;

    const container = document.querySelector(containerId);
    container?.insertAdjacentHTML("beforeend", modalHTML);

    const modalElement = document.getElementById("exampleModalToggle");
    const modal = new bootstrap.Modal(modalElement);

    const confirmBtn = document.querySelector(".proceed_delete");
    const abortBtn = document.querySelector(".cancel_delete");

    confirmBtn?.addEventListener("click", async () => {
      modal.hide();
      setTimeout(() => {
        modalElement.remove();
        resolve("confirmed!");
      }, 300);
    });

    abortBtn?.addEventListener("click", async () => {
      modal.hide();
      setTimeout(() => {
        modalElement.remove();
        displayLabel([
          "review_main_wrapper",
          "alert-secondary",
          `This process has been aborted.`,
        ]);
        resolve("Aborted.");
      }, 300);
    });

    modal.show();

    setTimeout(() => {
      abortBtn?.focus();
    }, 150);
  });
}
export function validateSlug(slug, url) {
  let httpOccurrences = (url.match(/http:\/\//g) || []).length;
  let httpsOccurrences = (url.match(/https:\/\//g) || []).length;

  if (httpOccurrences + httpsOccurrences > 1) {
    const errorMessage =
      "Invalid characters detected in the provided URL. Use a valid URL!";
    displayLabel(["review_main_wrapper", "alert-danger", errorMessage]);
    justForAMoment("Aborting...");
    return false;
  }
  const normalizedSlug = slug.trim().replace("-", ".");

  const urlHostMatch = url.match(/https?:\/\/(?:www\.)?([^\/]+)/);

  if (!urlHostMatch) {
    displayLabel([
      "review_main_wrapper",
      "alert-danger",
      "Invalid URL format!",
    ]);
    justForAMoment("Aborting...");
    return false;
  }

  const extractedFullHost = urlHostMatch[1].trim();
  const extractedMainHost = extractedFullHost.match(/([^\/.]+)\./);
  if (
    extractedMainHost &&
    extractedMainHost[1] === normalizedSlug.split(".")[0]
  ) {
    return true;
  }

  const slugBase = normalizedSlug.split(".")[0];
  if (
    extractedFullHost.includes(slugBase) &&
    extractedFullHost.indexOf(slugBase) < extractedFullHost.lastIndexOf(".")
  ) {
    return true;
  }

  if (url.includes(normalizedSlug)) {
    return true;
  }

  const errorMessage = `URL does not match the selected site name (${slug}).`;
  displayLabel(["review_main_wrapper", "alert-danger", errorMessage]);
  justForAMoment("Aborting...");
  return false;
}
export function justForAMoment(message = "Loading") {
  runSpinner(false, message);
  setTimeout(() => runSpinner(true), 2000);
}
export function shakeAnimation(selector) {
  return new Promise((resolve) => {
    try {
      const element = document.querySelector(selector),
        shakeClass = "shake-animation";

      if (element) {
        element.classList.add(shakeClass);

        setTimeout(() => {
          element.classList.remove(shakeClass);
          resolve();
        }, 2000);
      } else {
        resolve();
      }
    } catch (e) {
      console.error(e.message);
      resolve();
    }
  });
}
export function clearProfileForm() {
  const selectDropdown = document.getElementById("inputGroupSiteOptions");
  const textareaInput = document.getElementById("propertUrlInputY");
  if (selectDropdown && textareaInput) {
    selectDropdown.selectedIndex = 0;
    textareaInput.value = "";
  }
  return;
}
export async function removeElementFromDOM(elementAnchor) {
  try {
    const element = document.querySelector(elementAnchor);
    if (element) {
      element.remove();
    }
  } catch (e) {
    console.log(e.message);
  }
}
export async function removeChildElementsFromDOM(elementAnchor) {
  try {
    if (typeof elementAnchor !== "string" || !elementAnchor.trim()) return;
    const elements = document.querySelectorAll(elementAnchor);
    elements?.forEach((element) => element.remove());
  } catch (e) {
    console.error("Error removing elements:", e.message);
  }
}
export async function finishSetup() {
  try {
    const userString = sessionStorage.getItem("user");
    const user = userString ? JSON.parse(userString) : null;

    let propertyName = user?.name?.replace(/_/g, " ") || "";
    propertyName = propertyName.split("@")[0];
    const headingElement = document.querySelector(".subb_head_ing a");

    if (headingElement) headingElement.textContent = propertyName;
  } catch (error) {
    console.error("Error in finishSetup:", error);
  }
}
export function formatDate(timestamp) {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hours = String(date.getUTCHours()).padStart(2, "0");
  const minutes = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
export function clearContainer(anchorTagOrElement) {
  try {
    const parentElement =
      typeof anchorTagOrElement === "string"
        ? document.querySelector(anchorTagOrElement)
        : anchorTagOrElement;

    if (!parentElement) return false;

    const reviewContainers =
      parentElement.querySelectorAll(".review-container");
    if (!reviewContainers.length) return false;

    reviewContainers.forEach((container) => container.remove());

    return true;
  } catch (error) {
    console.error(`Error clearing review containers: ${error.message}`);
    return false;
  }
}

export function mountAdminPageHandler(parentSelector, data) {
  const parentElement = document.querySelector(parentSelector);
  const is_ready = clearContainer(parentElement);

  if (!parentElement && !is_ready) return;

  let container = parentElement.querySelector(".admin_page_outer");
  if (!container) {
    container = document.createElement("div");
    container.className = "admin_page_outer d-flex flex-wrap  gap-2";
    parentElement.appendChild(container);
  }

  if (!data.length) return false;

  container.innerHTML = "";
  data.forEach((item) => {
    const {
      _id: id,
      isAdmin,
      isSuperUser,
      hasReviewProfile,
      email,
      userId,
      data_size,
      createdAt,
      isSubscribed,
      profiles: review_profiles,
    } = item;
    let name = item?.name;

    const buttonClass = isSubscribed ? "btn-success" : "btn-warning";
    const buttonText = isSubscribed
      ? "Deactivate subscription"
      : "Activate subscription";

    const sanitizeName = (name) =>
      name?.replace(/_/g, " ").replace(/@.*/, "").toUpperCase();
    name = sanitizeName(name);

    const card = document.createElement("div");
    card.className = `card m-1 shadow-lg rounded user_accountcard _${id}_`;
    card.setAttribute("draggable", true);
    card.style =
      "max-width: 15rem; min-width: 30%; min-height: 30vh; max-height: auto;";

    const buttonState = isSubscribed ? "true" : "false";

    card.innerHTML = `
              <h5 class="card-header bg-transparent text-center">${name}</h5>
              <div class="card-body text-dark" style="overflow-y: auto;">
                  <ul class="list-group">
                      <li class="list-group-item" data-sub="${id}">${
      (isSubscribed && "Subscription Active: true") ||
      "Subscription Active: false"
    }</li>
                      <li class="list-group-item">Account Email: ${email}</li>
                      <li class="list-group-item" data-admin="${isAdmin}">Is Admin: ${isAdmin}</li>
                      <li class="list-group-item">Is Superuser: ${isSuperUser}</li>
                      <li class="list-group-item">Has Reviews Profiles: ${hasReviewProfile}</li>
                      <li class="list-group-item" data-uid="${userId}">User ID: ${userId}</li>
                      <li class="list-group-item">Account ID: ${id}</li>
                      <li class="list-group-item">Storage space: ${data_size}</li>
                      <li class="list-group-item">Review Profile Count: ${
                        (review_profiles?.length && review_profiles.length) ||
                        "__"
                      }</li>
                      <li class="list-group-item">Created At: ${createdAt}</li>
                  </ul>
              </div>
              <div class="container bg-transparent d-flex flex-column gap-2 pb-2">
                <button type="button" class="btn ${buttonClass} shadow w-100 subscription-btn" 
                  data-user-id="${id}" 
                  data-isSubscribed="${isSubscribed}">
                  ${buttonText}
                </button>


                  <button type="button" class="btn btn-danger border-danger shadow w-100 delete-btn" data-user-id="${id}">Delete account</button>
              </div>`;

    container.appendChild(card);
  });
  const subscriptionButtons = container.querySelectorAll(".subscription-btn");

  subscriptionButtons.forEach((button) => {
    let userId = button.getAttribute("data-user-id");
    initializeSubscriptionButtonState(userId, button);
    button.addEventListener("click", function (e) {
      userId = e.target.getAttribute("data-user-id");
      const isCurrentlyActive =
        e.target.textContent.trim() === "Deactivate subscription";

      toggleUserSubscription(userId, isCurrentlyActive, e.target);
    });
  });

  const deleteButtons = container.querySelectorAll(".delete-btn");
  deleteButtons.forEach((button) => {
    button.addEventListener("click", function (e) {
      const userId = this.getAttribute("data-user-id");
      deleteUserAccount(userId, e);
    });
  });
}
async function toggleUserSubscription(
  userId,
  isCurrentlyActive,
  buttonElement
) {
  try {
    const subscriptionKey = `user_subscription_${userId}`;
    runSpinner(false, "Processing...");

    const user = getAuthHandler();
    const { "auth-token": token } = user;

    const apiClient = await API_CLIENT();
    const url = `/user/update-subscription/${userId}`;
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const response = await apiClient.put(url, {}, { headers });

    if (response.status === 200) {
      // Get the new subscription state from the response
      const newSubState = response.data.isSubscribed;

      // Find the parent card
      const parentCard = document.querySelector(`._${userId}_`);
      if (!parentCard) {
        console.error(`Parent card for user ${userId} not found.`);
        return false;
      }

      // Update the button state (text and class)
      updateButtonState(buttonElement, newSubState);

      // Update the subscription status text in the list
      updateSubscriptionStatusDisplay(parentCard, userId, newSubState);

      // Save the current state to localStorage
      sessionStorage.setItem(
        subscriptionKey,
        JSON.stringify({ isSubscribed: newSubState, lastUpdated: Date.now() })
      );

      displayLabel([
        "review_main_wrapper",
        "alert-success",
        newSubState
          ? "Account subscription activated successfully"
          : "Account subscription deactivated successfully",
      ]);

      runSpinner(true);
      return true;
    } else {
      displayLabel([
        "review_main_wrapper",
        "alert-warning",
        "User account subscription update failed!",
      ]);
      return false;
    }
  } catch (error) {
    console.error("Error updating subscription:", error);
    displayLabel([
      "review_main_wrapper",
      "alert-danger",
      "Failed to update subscription status",
    ]);
    runSpinner(true);
    return false;
  }
}

function updateButtonState(buttonElement, isSubscribed) {
  // Update button text
  buttonElement.textContent = isSubscribed
    ? "Deactivate subscription"
    : "Activate subscription";

  // Update button class
  buttonElement.classList.remove("btn-success", "btn-warning");
  buttonElement.classList.add(isSubscribed ? "btn-success" : "btn-warning");

  // Update data attribute
  buttonElement.setAttribute("data-isSubscribed", isSubscribed.toString());
}

function updateSubscriptionStatusDisplay(parentCard, userId, isSubscribed) {
  // Find the subscription status element by data-sub attribute
  const subscriptionStatusElement = parentCard.querySelector(
    `[data-sub="${userId}"]`
  );

  if (subscriptionStatusElement) {
    // Update the text content to reflect the new state
    subscriptionStatusElement.textContent = `Subscription Active: ${isSubscribed}`;
    subscriptionStatusElement.setAttribute(
      "data-sub-active",
      isSubscribed.toString()
    );
  } else {
    console.error(`Subscription status element for user ${userId} not found.`);
  }
}

function initializeSubscriptionButtonState(userId, buttonElement) {
  const subscriptionKey = `user_subscription_${userId}`;
  const storedSubscription = sessionStorage.getItem(subscriptionKey);

  // Default to the data attribute value
  let isSubscribed = buttonElement.getAttribute("data-isSubscribed") === "true";

  if (storedSubscription) {
    try {
      const parsedData = JSON.parse(storedSubscription);
      // Update from localStorage if available
      isSubscribed = parsedData.isSubscribed;

      // Find the parent card to update the subscription text as well
      const parentCard = buttonElement.closest(`.user_accountcard`);
      if (parentCard) {
        updateSubscriptionStatusDisplay(parentCard, userId, isSubscribed);
      }
    } catch (error) {
      console.error("Error parsing stored subscription state:", error);
    }
  }

  // Update the button state
  updateButtonState(buttonElement, isSubscribed);
}

async function deleteUserAccount(userId, e) {
  try {
    const confirmation = await confirmAction(
      "#body",
      `Deletion action in progress... This action is irreversible. Are you certain you want to proceed?`
    );

    if (confirmation !== "confirmed!") {
      console.log("User aborted deletion.");
      return;
    }
    runSpinner(false, "Processing...");

    const accountCard = e.target.closest(".user_accountcard");

    if (accountCard) {
      const user = getAuthHandler();
      const { "auth-token": token } = user;

      const apiClient = await API_CLIENT();

      let page = 1;
      const baseUrl = `/user/purge-user/${userId}`;
      const query = `?page=${page}`;
      const url = `${baseUrl}${query}`;

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };

      const response = await apiClient.delete(url, { headers });

      if (response.status === 200 && response.statusText === "OK") {
        const data = response.data?.user_profiles || [];
        runSpinner(true);
        accountCard.remove();
        displayLabel([
          "review_main_wrapper",
          "alert-success",
          "user account deleted successfully",
        ]);
        return true;
      } else {
        runSpinner(false, "Acknowledged...");
        displayLabel([
          "review_main_wrapper",
          "alert-warning",
          "An error occured: user object could not be deleted",
        ]);
      }
    } else {
      console.log("Could not find the user account card.");
    }
  } catch (error) {
    runSpinner(true);
    displayLabel([
      "review_main_wrapper",
      "alert-danger",
      "An error occured: user object could not be deleted",
    ]);
    console.error("Error deleting user account:", error);
  }
}
export async function handleSearchFormSubmission(form) {
  try {
    const formData = new FormData(form);
    const searchParams = new URLSearchParams();

    // Convert FormData to URLSearchParams
    for (const [key, value] of formData.entries()) {
      if (value) {
        searchParams.append(key, value);
      }
    }

    // Validate date range if applicable
    const rangeFieldValue = formData.get("range_filter_field");
    if (rangeFieldValue) {
      const fromDate = new Date(formData.get("range_filter_from"));
      const toDate = new Date(formData.get("range_filter_to"));

      if (fromDate > toDate) {
        runSpinner(true);
        displayLabel([
          "review_main_wrapper",
          "alert-warning",
          'Invalid date range: "From" date must be before "To" date',
        ]);
        return { error: "Invalid date range" };
      }
    }

    if (searchParams.toString() === "") {
      console.warn("No search parameters provided");
      return { error: "No search parameters provided" };
    }

    // Get auth information
    const user = getAuthHandler();
    const { "auth-token": token, userId } = user;

    // Create the API URL with query parameters
    const baseUrl = `/user/${userId}/search`;
    const searchUrl = `${baseUrl}?${searchParams.toString()}`;

    // Set headers for the request
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    // Make the API call
    const apiClient = await API_CLIENT();
    const response = await apiClient.post(searchUrl, {}, { headers });

    if (response.status === 200 && response.data.success) {
      return { data: response.data.data };
    } else {
      console.error("Search failed:", response.data.message);
      return { error: response.data.message };
    }
  } catch (error) {
    console.error("Error processing search form:", error);
    return { error: error.message };
  }
}
export async function ReviewHTML(reviewsDataOject = {}, cardIsNew = false) {
  try {
    if (!reviewsDataOject) return;
    const _id = reviewsDataOject?._id,
      reviewSiteSlug = reviewsDataOject?.reviewSiteSlug,
      reviewPageId = reviewsDataOject?.reviewPageId,
      urlAgent = reviewsDataOject?.urlAgent,
      author = reviewsDataOject?.author,
      authorExternalId = reviewsDataOject?._id,
      authorLocation = reviewsDataOject?.authorLocation,
      authorReviewCount = reviewsDataOject?.authorReviewCount,
      authorProfileUrl = reviewsDataOject?.authorProfileUrl,
      reviewBody = reviewsDataOject?.reviewBody,
      hasPropertyResponse = reviewsDataOject?.hasPropertyResponse,
      propertyResponse = reviewsDataOject?.propertyResponse,
      brandCheck = reviewsDataOject?.brandCheck,
      language1 = reviewsDataOject?.language,
      recommended = reviewsDataOject?.recommends,
      propertyProfileUrl = reviewsDataOject?.propertyProfileUrl,
      originalEndpoint = reviewsDataOject?.originalEndpoint,
      propertyName = reviewsDataOject?.propertyName,
      rating = reviewsDataOject.rating,
      replyUrl = reviewsDataOject?.replyUrl,
      stayDate = reviewsDataOject?.stayDate,
      stayStatus = reviewsDataOject?.stayStatus,
      reviewDate = reviewsDataOject?.reviewDate,
      checkInDate = reviewsDataOject?.checkInDate,
      checkOutDate = reviewsDataOject?.checkOutDate,
      title = reviewsDataOject?.title,
      userId = reviewsDataOject?.userId,
      tripType = normalizeTravelType(reviewsDataOject?.tripType),
      subratings = reviewsDataOject?.subratings,
      uuid = reviewsDataOject?.uuid,
      siteId = reviewsDataOject.siteId,
      internalId = reviewsDataOject?.internalId,
      externalId = reviewsDataOject?.externalId,
      country = reviewsDataOject?.country,
      createdAt = reviewsDataOject?.createdAt,
      updatedAt = reviewsDataOject?.updatedAt,
      miscellaneous = reviewsDataOject?.miscellaneous,
      roomTypeName = miscellaneous?.roomTypeName,
      lengthOfStay = miscellaneous?.lengthOfStay,
      language2 = miscellaneous?.languageDetails?.fullLanguage,
      language = (language1 && language1) || language2,
      isExpertReviewer = miscellaneous?.isExpertReviewer;

    const trimmedReviewBody =
      (reviewBody && reviewBody) ||
      "No guest review comment provided. This review has no comments.";

    const needsExpansion = trimmedReviewBody.length > 700;
    const reviewTextPreview = needsExpansion
      ? trimmedReviewBody.slice(0, 700)
      : trimmedReviewBody;

    const reviewBodyHTML = `
        <p class="review-body ${
          needsExpansion ? "collapsed" : ""
        }" id="review-body-${_id}">
          <span class="review-text">${reviewTextPreview}</span>
          ${
            needsExpansion
              ? `<span class="expand-toggle" data-review-id="${_id}">...Read more</span>`
              : ""
          }
        </p>
      `;

    const InnerReviewHTMLContent = `
        <div id="${_id}" class="row review-container shadow  __${authorExternalId}  m-auto ${userId}" data-reviewPageId="${reviewPageId}" data-slug="${reviewSiteSlug}">
              <div class="card text-bg-light my-font-color  card-left" data-userId="${userId}" style="width: 22%;margin:0 !important">
                  <div class="card-header shadow-none card_header">
                  <img src="" style="width:30%;max-width:100px !important;min-width:65px !important;max-height:100px !important;border-radius:3px" class="img-thumbnail review-logo-${uuid}-${internalId} bg-transparent" alt="...">
                  </div>
                  <div class="card-body d-flex flex-column left__body" data-subratings="${authorExternalId}">
                    <span class="text" data-guest-rating="rating-${authorExternalId}" data-rating="${rating}"></span>
                    <br class="linner">
                  </div>
              </div>
    
              <div class="card card-${_id} text-bg-light my-font-color card-middle" style="width:55%;">
                  <div class="card-body middle__body">
                    <div class="d-flex">
                        <a class="text-secondary text-decoration-underline" target="_blank" href="${authorProfileUrl}">
                        <h4 class="card-title review-author">${
                          (author && author) || ".."
                        }</h4>
                        </a>
                        </a>
                    </div>
                    <h5 class="card-title review-author d-inline m-1 text-left text-muted">
                      ${title ? `<q>${title}</q>` : ""}
                    </h5>
                    ${reviewBodyHTML}

                      <span class="card-text review-submitted-date">
                        <small class="text-muted">Created: ${formatDate(
                          createdAt
                        )}</small>
                      </span>              
                  </div>
              </div>
    
              <div class="card text-bg-light card-right" style="width: 22%;">
                  <div class="card-header border-transparent shadow-none mt-1">
                      <div class="btn-group d-block text-center align-content-center">
                            <button title="not implimented!" class="btn btn-lg text-muted  btn-outline-transparent dropdown-toggle btn-block" type="button" data-bs-toggle="dropdown" data-bs-auto-close="true" aria-expanded="false">
                              Actions
                            </button>
                            <ul class="dropdown-menu shadow rounded bg-light">
                              <li><a class="dropdown-item text-dark rounded shadow shadow-sm" href="#">Expand review Object</a></li>
                              <li><a class="dropdown-item text-dark rounded shadow shadow-sm" href="#">Contact customer service</a></li>
                              <li><a class="dropdown-item text-dark rounded shadow shadow-sm" href="#">Weekly review analysis</a></li>
                              <li><a class="dropdown-item text-dark rounded shadow shadow-sm" href="#">Generate monthly report</a></li>
                            </ul>
                        </div>
                    </div>
                  <div class="d-grid gap-2 col-6 mx-auto m-auto action_buttons right__body" style="width:100%;">
                    <a class="btn btn-sm btn-transparent btn-outline-secondary action_2 shadow" href="${
                      originalEndpoint || propertyProfileUrl
                    }" target="_blank"  type="button">Go to ${reviewSiteSlug}</a>
                    <button disabled class="btn btn-sm btn-transparent btn-outline-secondary shadow action_4" pageid-data="${_id}" authorexternalid="${authorExternalId}"  type="button">Update review</button>
                    <a
                      href="${
                        originalEndpoint || propertyProfileUrl
                      }" target="_blank" 
                      class="btn btn-sm btn-transparent btn-outline-secondary action_5 shadow
                        ${hasPropertyResponse ? "d-none" : ""}" 
                      respond-review-data="${_id}"  
                      type="button" 
                      ${hasPropertyResponse ? "disabled" : ""}
                    > Respond to review </a>
                    <button class="btn btn-sm btn-transparent btn-outline-danger action_3 shadow" del-revie-data="${_id}"  type="button">Delete review</button>
                  </div>
            </div>
        </div>`;

    const parent_wrapper = document.querySelector("#review_main_wrapper");

    if (cardIsNew) {
      parent_wrapper?.insertAdjacentHTML("afterbegin", InnerReviewHTMLContent);
    } else {
      parent_wrapper?.insertAdjacentHTML("beforeend", InnerReviewHTMLContent);
    }
    createSubratings(subratings, `[data-subratings="${authorExternalId}"]`);
    createRating(rating, `[data-guest-rating="rating-${authorExternalId}"]`);
    addReviewResponse(
      propertyResponse,
      `.card-${_id}`,
      hasPropertyResponse,
      _id
    );
    responseButtonVisibility(hasPropertyResponse, `.has-response-${uuid}`);
    reviewCount(authorReviewCount, `[data-subratings="${authorExternalId}"]`);
    getSiteLogoPath(
      reviewSiteSlug,
      brandCheck,
      `.review-logo-${uuid}-${internalId}`
    );
    generateLeftContainerContent(
      [
        { key: "Posted", value: reviewDate },
        { key: "Checkin", value: checkInDate },
        { key: "Checkout", value: checkOutDate },
        { key: "Guest stayed", value: `${(stayStatus && "Yes") || ""}` },
        { key: "Recommended", value: `${(recommended && "Yes") || ""}` },
        { key: "Trip type", value: tripType },
        { key: "Room type", value: roomTypeName },
        { key: "Nights stayed", value: lengthOfStay },
        { key: "Country", value: country },
        { key: "Professional Reviewer", value: isExpertReviewer },
      ],
      authorExternalId
    );

    if (needsExpansion) {
      const expandToggle = document.querySelector(
        `.expand-toggle[data-review-id="${_id}"]`
      );

      const reviewBody = document.getElementById(`review-body-${_id}`);
      const reviewText = reviewBody.querySelector(".review-text");

      expandToggle.addEventListener("click", () => {
        const isExpanded = reviewBody.classList.toggle("expanded");
        reviewText.innerHTML = isExpanded
          ? trimmedReviewBody
          : trimmedReviewBody.slice(0, 700);
        expandToggle.textContent = isExpanded ? "Collapse" : "...Read more";
      });
    }

    return InnerReviewHTMLContent;
  } catch (error) {
    console.log(error);
  }
}
export async function createSubratings(subratingsArray, selector) {
  const cardBody = document.querySelector(selector);

  if (subratingsArray && subratingsArray?.length > 0) {
    subratingsArray.forEach((subrating) => {
      const { key, value } = subrating;
      const totalStars = 5;

      const spanElement = document.createElement("small");
      spanElement.classList.add("text-warning");

      const smallElement = document.createElement("small");
      smallElement.classList.add("text-dark", "text-muted");
      smallElement.textContent = `${key}: `;

      const starsElement = document.createElement("span");

      // Loop through all 5 stars
      for (let i = 1; i <= totalStars; i++) {
        const star = document.createElement("span");
        star.style.opacity = "0.8";

        if (i <= value) {
          star.innerHTML = "&bigstar;";
          star.style.color = "#29cf00";
        } else {
          star.innerHTML = "&bigstar;";
          star.style.color = "#29cf0080";
        }

        starsElement.appendChild(star);
      }

      spanElement.appendChild(smallElement);
      spanElement.appendChild(starsElement);

      cardBody?.appendChild(spanElement);
    });
  }
}
export async function createRating(ratingValue, selector) {
  const smallElement = document.querySelector(selector);
  if (smallElement) {
    const totalStars = 5;

    const containerElement = document.createElement("span");
    containerElement.classList.add("text-muted");
    const textElement = document.createElement("small");
    textElement.textContent = "Rating: ";

    const starsElement = document.createElement("small");

    for (let i = 1; i <= totalStars; i++) {
      const star = document.createElement("span");

      if (i <= ratingValue) {
        star.innerHTML = "&bigstar;";
        star.style.color = "#29cf00";
      } else {
        star.innerHTML = "&bigstar;";
        star.style.color = "#C1F2B0;";
      }

      starsElement.appendChild(star);
    }

    containerElement.appendChild(textElement);
    containerElement.appendChild(starsElement);

    smallElement.innerHTML = "";
    smallElement.appendChild(containerElement);
  }
}
export function addReviewResponse(
  responseObject = {},
  response_anchor,
  hasPropertyResponse,
  _id
) {
  try {
    if (responseObject && responseObject.body?.length !== null) {
      const { body: responseBody, responseDate, author } = responseObject;

      const reviewContainer = document.querySelector(response_anchor);
      if (reviewContainer) {
        const accordionElement = document.createElement("div");
        accordionElement.className =
          "accordion accordion-flush bg-light  res_body";
        accordionElement.id = _id;

        const accordionItem = document.createElement("div");
        accordionItem.className = "accordion-item bg-light";
        accordionItem.dataset.parent = `#${_id}`;

        const accordionHeader = document.createElement("h2");
        accordionHeader.className = "accordion-header";
        accordionHeader.id = `flush-heading-${_id}`;

        const accordionButton = document.createElement("button");
        accordionButton.className =
          "accordion-button  text-dark shadow-sm collapsed text-center";
        accordionButton.type = "button";
        accordionButton.setAttribute("data-bs-toggle", "collapse");
        accordionButton.setAttribute(
          "data-bs-target",
          `#flush-collapse-${_id}`
        );
        accordionButton.setAttribute("aria-expanded", "false");
        accordionButton.setAttribute("aria-controls", `flush-collapse-${_id}`);
        accordionButton.innerHTML = "Response from the owner";

        accordionHeader.appendChild(accordionButton);

        const accordionBody = document.createElement("div");
        accordionBody.id = `flush-collapse-${_id}`;
        accordionBody.className = "accordion-collapse collapse show";
        accordionBody.setAttribute("aria-labelledby", `flush-heading-${_id}`);

        const accordionBodyContent = document.createElement("div");
        accordionBodyContent.className = "accordion-body bg-light shadow";
        accordionBodyContent.innerHTML = responseBody;

        const response_date = document.createElement("p");
        response_date.className = "container bg-light text-muted";
        response_date.innerHTML = responseDate
          ? `Response posted on: ${responseDate}`
          : "";

        accordionBody.appendChild(accordionBodyContent);
        accordionBody.appendChild(response_date);

        accordionItem.appendChild(accordionHeader);
        accordionItem.appendChild(accordionBody);

        accordionElement.appendChild(accordionItem);

        hasPropertyResponse &&
          reviewContainer?.insertBefore(
            accordionElement,
            reviewContainer.firstChild
          );

        const existingElement = document.getElementById(`#${_id}`);
        if (existingElement) {
          const accordionInstance = new bootstrap.Collapse(accordionItem, {
            parent: `#${_id}`,
            toggle: false,
          });
          accordionInstance.show();
        }
      }
    }
  } catch (error) {
    console.log("Error in addReviewResponse:", error.message);
  }
}
export function responseButtonVisibility(hasPropertyResponse, selector) {
  const button = document.querySelector(selector);
  if (button) {
    if (hasPropertyResponse) {
      button.classList.add("hide");
    } else {
      button.classList.remove("hide");
    }
  }
}
export async function reviewCount(countTotal, selector) {
  const container = document.querySelector(selector);

  if (container && countTotal !== undefined && countTotal !== null) {
    const spanElement = document.createElement("small");
    spanElement.classList.add("text-muted");

    const displayedCount = countTotal == 0 ? 1 : countTotal;

    spanElement.innerHTML = `Review count: <small style="color: green; font-weight: 700">${displayedCount}</small>`;
    container.insertBefore(spanElement, container.querySelector("br"));
  }
}
export async function getSiteLogoPath(reviewSiteSlug, brandCheck, uuid) {
  const defaultPath = "../images/fallback.png";
  const extractBaseDomain = (slug) => (slug ? slug.split("-")[0] : null);

  const baseDomain = brandCheck
    ? extractBaseDomain(brandCheck.toLowerCase())
    : extractBaseDomain(reviewSiteSlug);

  const siteLogo = Object.values(siteLogos).find(
    (logo) => extractBaseDomain(logo.slug) === baseDomain
  );

  if (siteLogo) {
    const cardLogo = await document.querySelector(uuid);
    if (cardLogo) {
      cardLogo.src = siteLogo.logopath || defaultPath;

      cardLogo.onerror = function () {
        this.src = defaultPath;
        this.onerror = null;
      };
    }
  }
}
export async function generateLeftContainerContent(
  dataArray,
  authorExternalId
) {
  const container = document.querySelector(
    `.left__body[data-subratings="${authorExternalId}"]`
  );
  if (!container) return console.log("Container not found");

  dataArray.forEach((dataObject, index) => {
    try {
      if (!dataObject || typeof dataObject !== "object") {
        console.log(`Invalid object at index ${index}. Skipping append.`);
        return;
      }
      const { key, value } = dataObject;
      if (!key || !value) return;

      const displayValue = value === false ? "No" : value;
      const spanElement = document.createElement("span");
      spanElement.className = "text text-muted";
      spanElement.innerHTML = `<small>${key}: <a href="#" style="cursor:pointer;" class="sub_link text-success" data-datatype="${value}">${displayValue}</a></small>`;

      const brEle = container.querySelector(".linner");
      container.insertBefore(spanElement, brEle);
    } catch (error) {
      console.log(`Error appending element at index ${index}:`, error);
    }
  });
}
export function normalizeTravelType(input) {
  if (!input) return;
  return input
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
export async function handleSearchPannel(anchorSelector) {
  const anchorElement = document.querySelector(anchorSelector);

  if (!anchorElement)
    return console.error(`Element '${anchorSelector}' not found.`);

  const form = document.createElement("form");
  form.className = "w-100 main_search__container border";

  form.innerHTML = `
      <fieldset class="bg-transparent _innter_search_cont p-1 shadow">
          <div class="row d-flex" style="justify-content:center; align-items-center;flex-wrap:wrap">
              <div class="col-12 col-md-2">
                  <label for="range_filter_field" class="form-label">Date Range</label>
                  <select name="range_filter_field" id="range_filter_field" class="form-select">
                      <option value="">All</option>
                      <option value="created_at">created_at</option>
                      <option value="updated_at">updated_at</option>
                      <option value="date_review">date_review</option>
                  </select>
              </div>
              <div class="col-12 col-md-2">
                  <label for="range_filter_from" class="form-label">From</label>
                  <input id="range_filter_from" name="range_filter_from" type="date" class="form-control shadow" value="2025-03-17">
              </div>
              <div class="col-12 col-md-2">
                  <label for="range_filter_to" class="form-label">To</label>
                  <input id="range_filter_to" name="range_filter_to" type="date" class="form-control shadow" value="2025-03-18">
              </div>
              <div class="col-12 col-md-2">
                  <label for="sort_field" class="form-label">Sort By</label>
                  <select name="sort_field" id="sort_field" class="form-select">
                      <option value="created_at" selected>created_at</option>
                      <option value="updated_at">updated_at</option>
                      <option value="date_review">date_review</option>
                  </select>
              </div>
              <div class="col-12 col-md-2 form-group">
                  <label for="search" class="form-label">Search</label>
                  <input type="text" data-search="t_search_box" placeholder="Type here..." value="" class="form-control shadow" name="q">
              </div>                      
          </div>
      </fieldset>`;

  anchorElement.prepend(form);

  const searchIcon = document.querySelector(".search_icon_cont");
  if (searchIcon) {
    searchIcon.addEventListener("click", (e) => {
      e.preventDefault();
      const searchPanel = document.querySelector(".main_search__container");
      if (searchPanel) {
        const isVisible = searchPanel.classList.contains("show_searchpannel");
        searchPanel.classList.toggle("show_searchpannel");

        if (isVisible) {
          form.dispatchEvent(new Event("submit"));
        }
      }
    });
  } else {
    console.warn("Search icon not found");
  }
  const searchInput = form.querySelector('input[name="q"]');
  if (searchInput) {
    searchInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        form.dispatchEvent(new Event("submit"));
      }
    });
  }
  document.body.addEventListener("click", (e) => {
    const searchPanel = document.querySelector(".main_search__container");
    if (
      searchPanel &&
      !e.target.closest(".main_search__container") &&
      !e.target.closest(".search_icon_cont")
    ) {
      searchPanel.classList.remove("show_searchpannel");
    }
  });

  document
    .querySelector("#review_main_wrapper")
    .addEventListener("scroll", () => {
      const searchPanel = document.querySelector(".main_search__container");
      if (searchPanel) {
        setTimeout(
          () => searchPanel.classList.remove("show_searchpannel"),
          800
        );
      }
    });
  const selectElements = form.querySelectorAll("select");
  selectElements.forEach((select) => {
    select.addEventListener("change", () => {
      form.dispatchEvent(new Event("submit"));
    });
  });

  const dateInputs = form.querySelectorAll('input[type="date"]');
  dateInputs.forEach((input) => {
    input.addEventListener("change", () => {
      setTimeout(() => {
        form.dispatchEvent(new Event("submit"));
      }, 300);
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    runSpinner(false, "Searching...");

    const { data, error } = await handleSearchFormSubmission(e.target);
    const reviewData = data?.reviews;

    if (error) {
      runSpinner(true);
      if (error !== "No search parameters provided") {
        displayLabel([
          "review_main_wrapper",
          "alert-warning",
          `Search error: ${error}`,
        ]);
      }
    }
    runSpinner(true);
    displayLabel([
      "review_main_wrapper",
      "alert-success",
      `Success: Here are your search results`,
    ]);

    if (!reviewData?.length)
      return displayLabel([
        "review_main_wrapper",
        "alert-warning",
        `There are no results for this search`,
      ]);
    await removeChildElementsFromDOM(".review-container");

    reviewData.forEach(async (review) => {
      await ReviewHTML(review, true);
    });
  });

  return form;
}
