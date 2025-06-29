import { PLUGINS } from "../utils/plugins.js";
import { finishSetup, handleSearchPannel } from "../utils/utilities.js";
const {
  logOutUser,
  setUpBackToTop,
  roadRunners,
  userGuideModel,
  setupDropdownHover,
  superManHandle,
  createAdminPage,
  createAccountPage,
  handleModleActiveStates,
  handleReviewButtonsEvents,
  handleContainerScrollEffect,
  handlePaginatedDataAllAccounts,
} = PLUGINS;

import { handleProfileGenerator } from "./apiCallHandlers.js";

function setupEventListeners() {
  logOutUser(".logoutuser_link");
  setUpBackToTop("review_main_wrapper");
  handleContainerScrollEffect("review_main_wrapper");
  document.querySelector(".how_to_link")?.addEventListener("click", () => {
    localStorage.setItem("userGuideShown", false);
    userGuideModel();
  });
  document.querySelector(".profile_details")?.addEventListener("click", () => {
    createAdminPage();
  });
  document.querySelector(".account_details")?.addEventListener("click", () => {
    createAccountPage();
  });
}
export async function MAIN_PAGE() {
  try {
    let pageContent = `
      <nav class="navbar navbar__default navbar-expand-lg navbar-light shadow shadow-sm glassy bg-light">
        <div class="container-fluid">
          <a class="navbar-brand text-info" href="/" title="main page">
            <img src="../images/site_logo.jpeg" width="30" height="30" alt=""></img>
          </a>
          <button class="navbar-toggler navbar_btn" type="button" data-bs-toggle="collapse" data-bs-target="#navbarScroll" 
                  aria-controls="navbarScroll" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse" id="navbarScroll">
            <ul id="__nav" class="navbar-nav me-auto my-2 my-lg-0 navbar-nav-scroll border-1 border-danger" 
                style="--bs-scroll-height: 150px;">
              <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle text-dark text-uppercase" href="#" role="button" 
                   data-bs-toggle="dropdown" aria-expanded="false">
                  account
                </a>
                <ul class="dropdown-menu text-dark bg-light shadow shadow-lg" style="z-index:10 !important">
                  <li class="p-2"><a class="dropdown-item text-dark account_details text-uppercase" href="#">Account details</a></li>
                  <li class="p-2"><a class="dropdown-item text-dark profile_details text-uppercase" href="#">Profile details</a></li>
                  <li class="p-2"><a class="dropdown-item text-dark how_to_link text-uppercase" href="#">How to guide</a></li>
                  <li class="p-2"><a class="dropdown-item text-dark create_profile text-uppercase" href="#">Create review profile</a></li>
                  <li class="p-2"><a class="dropdown-item text-dark logoutuser_link text-uppercase" href="#">Logout</a></li>
                </ul>
              </li>
              <li class="nav-item dropdown">
                <a class="nav-link dropdown-toggle text-dark text-uppercase" href="#" role="button" 
                   data-bs-toggle="dropdown" aria-expanded="false">
                  sites
                </a>
                <ul class="dropdown-menu bg-light overflow-auto _inner_dropdown_canvas shadow shadow-lg" style="max-height: 350px;">
                  
                </ul>
              </li>
            </ul>
            <div class="container subb_head_ing d-flex justify-content-center align-content-center">
              <a class="lead btn btn-outline-secondary btn-lg text-uppercase" href="/" 
                 style="border-color: transparent !important;"></a>
            </div>
          </div>
        </div>
      </nav>
      <main class="parent__main">
        <div class="container bg-light shadow search_icon_cont d-flex justify-content-center align-content-center">
          <span class="lead text-danger">&#128269;</span>
        </div>
        <div id="review_main_wrapper" class="container review__wrapper">
          <!-- Review cards will be inserted here dynamically -->
        </div>
      </main>
    `;

    // Use the safer innerHTML approach for inserting content
    document.getElementById("innerBody").innerHTML = pageContent;

    // IMPORTANT: Setup event listeners AFTER setting innerHTML
    await loadAvailableSites();
    await setupEventListeners();
    await handlePaginatedDataAllAccounts();
    await handleReviewButtonsEvents();
    await superManHandle();
    await setupDropdownHover();
    await roadRunners();
    await finishSetup();
    await handleProfileGenerator(".create_profile");
    await handleSearchPannel(".navbar__default");
    await handleModleActiveStates();

    return true;
  } catch (e) {
    console.error("Error in MAIN_PAGE:", e);
    return false;
  }
}
export function renderReviewCard(review) {
  const cardHtml = `
    <div id="${review.id}" class="row review-container shadow shadow-sm __${
    review.id
  } m-auto ${review.userId} review-incoming" 
         data-reviewpageid="${review.pageId || "null"}" data-slug="${
    review.site
  }" data-observed="true">
      <!-- Left Card -->
      <div class="card text-bg-light my-font-color card-left" data-userid="${
        review.userId
      }" 
           style="width: 22%;margin:0 !important">
        <div class="card-header shadow-none card_header">
          <img src="../images/${review.site}_logo.png" 
               style="width:30%;max-width:100px !important;min-width:65px !important;max-height:100px !important;border-radius:3px" 
               class="img-thumbnail review-logo-${review.id}-${
    review.shortId
  } bg-transparent" alt="...">
        </div>
        <div class="card-body d-flex flex-column left__body" data-subratings="${
          review.id
        }">
          <span class="text" data-guest-rating="rating-${
            review.id
          }" data-rating="${review.rating}">
            <span class="text-muted"><small>Rating: </small><small>${renderStars(
              review.rating
            )}</small></span>
          </span>
          <small class="text-muted">Review count: <small style="color: green; font-weight: 700">${
            review.reviewCount
          }</small></small>
          <span class="text text-muted"><small>Posted: <a href="#" style="cursor:pointer;" class="sub_link text-success" data-datatype="${
            review.postedDate
          }">${review.postedDate}</a></small></span>
          <span class="text text-muted"><small>Checkin: <a href="#" style="cursor:pointer;" class="sub_link text-success" data-datatype="${
            review.checkinDate
          }">${review.checkinDate}</a></small></span>
          <span class="text text-muted"><small>Checkout: <a href="#" style="cursor:pointer;" class="sub_link text-success" data-datatype="${
            review.checkoutDate
          }">${review.checkoutDate}</a></small></span>
          <span class="text text-muted"><small>Guest stayed: <a href="#" style="cursor:pointer;" class="sub_link text-success" data-datatype="${
            review.guestStayed
          }">${review.guestStayed}</a></small></span>
          <span class="text text-muted"><small>Trip type: <a href="#" style="cursor:pointer;" class="sub_link text-success" data-datatype="${
            review.tripType
          }">${review.tripType}</a></small></span>
          <span class="text text-muted"><small>Room type: <a href="#" style="cursor:pointer;" class="sub_link text-success" data-datatype="${
            review.roomType
          }">${review.roomType}</a></small></span>
          <span class="text text-muted"><small>Nights stayed: <a href="#" style="cursor:pointer;" class="sub_link text-success" data-datatype="${
            review.nightsStayed
          }">${review.nightsStayed}</a></small></span>
          <span class="text text-muted"><small>Country: <a href="#" style="cursor:pointer;" class="sub_link text-success" data-datatype="${
            review.country
          }">${review.country}</a></small></span>
          <br class="linner">
        </div>
      </div>
      
      <!-- Middle Card -->
      <div class="card card-${
        review.id
      } text-bg-light my-font-color card-middle" style="width:55%;">
        ${renderResponseAccordion(review)}
        <div class="card-body middle__body">
          <div class="d-flex">
            <a class="text-secondary text-decoration-underline" target="_blank" href="${
              review.link
            }">
              <h4 class="card-title review-author">${review.authorName}</h4>
            </a>
          </div>
          <h5 class="card-title review-author d-inline m-1 text-left text-muted">
            <q>${review.title}</q>
          </h5>
          <p class="review-body">${review.body}</p>
          <span class="card-text review-submitted-date">
            <small class="text-muted">Created: ${review.createdDate}</small>
          </span>              
        </div>
      </div>
      
      <!-- Right Card -->
      <div class="card text-bg-light card-right" style="width: 22%;">
        <div class="card-header border-transparent shadow-none mt-1">
          <div class="btn-group d-block text-center align-content-center">
            <button title="not implimented!" class="btn btn-lg text-muted btn-outline-transparent dropdown-toggle btn-block" 
                    type="button" data-bs-toggle="dropdown" data-bs-auto-close="true" aria-expanded="false">
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
          <a class="btn btn-sm btn-transparent btn-outline-secondary action_2" href="${
            review.link
          }" target="_blank" type="button">
            Go to ${review.site}
          </a>
          <button ${
            review.canUpdate ? "" : "disabled"
          } class="btn btn-sm btn-transparent btn-outline-secondary shadow shadow-sm action_4" 
                  pageid-data="${review.id}" authorexternalid="${
    review.id
  }" type="button">Update review</button>
          <a href="${
            review.link
          }" target="_blank" class="btn btn-sm btn-transparent btn-outline-secondary action_5 shadow shadow-sm 
            ${review.canRespond ? "" : "d-none"}" respond-review-data="${
    review.id
  }" type="button" ${review.canRespond ? "" : "disabled"}>
            Respond to review
          </a>
          <button class="btn btn-sm btn-transparent btn-outline-danger action_3 shadow shadow-sm" del-revie-data="${
            review.id
          }" type="button">
            Delete review
          </button>
        </div>
      </div>
    </div>
  `;

  return cardHtml;
}
function renderResponseAccordion(review) {
  if (!review.response) return "";

  return `
    <div class="accordion accordion-flush bg-light res_body" id="${review.id}">
      <div class="accordion-item bg-light" data-parent="#${review.id}">
        <h2 class="accordion-header" id="flush-heading-${review.id}">
          <button class="accordion-button text-dark shadow-sm collapsed text-center" type="button" 
                  data-bs-toggle="collapse" data-bs-target="#flush-collapse-${review.id}" 
                  aria-expanded="false" aria-controls="flush-collapse-${review.id}">
            Response from the owner
          </button>
        </h2>
        <div id="flush-collapse-${review.id}" class="accordion-collapse collapse show" 
             aria-labelledby="flush-heading-${review.id}">
          <div class="accordion-body bg-light shadow">
            ${review.response}
          </div>
          <p class="container bg-light text-muted">Response posted on: ${review.responseDate}</p>
        </div>
      </div>
    </div>
  `;
}
function renderStars(rating) {
  let stars = "";
  for (let i = 1; i <= 5; i++) {
    if (i <= rating) {
      stars += '<span style="color: rgb(41, 207, 0);">★</span>';
    } else {
      stars += "<span>★</span>";
    }
  }
  return stars;
}
async function loadAvailableSites() {
  try {
    const data = await PLUGINS.loadeSiteSlugs();

    if (!Array.isArray(data.slugs)) {
      throw new Error("Invalid slug response");
    }

    const ul = document.querySelector("._inner_dropdown_canvas");
    ul.innerHTML = "";

    data.slugs.forEach((slug) => {
      const li = document.createElement("li");
      li.className = "p-2";

      const a = document.createElement("a");
      a.className = `dropdown-item btn btn-outline-success text-dark text-uppercase ${slug}`;
      a.href = "#";
      a.textContent = slug;

      li.appendChild(a);
      ul.appendChild(li);
    });
  } catch (error) {
    console.error("Error loading site slugs:", error);
  }
}
