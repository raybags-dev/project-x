import { PLUGINS } from '../utils/plugins.js'
import { finishSetup } from '../utils/utilities.js'
const {
  logOutUser,
  setUpBackToTop,
  roadRunners,
  userGuideModel,
  setupDropdownHover,
  superManHandle,
  createAdminPage,
  createAccountPage,
  handleReviewButtonsEvents,
  handleContainerScrollEffect,
  handlePaginatedDataAllAccounts
} = PLUGINS

import { handleProfileGenerator } from './apiCallHandlers.js'

function setupEventListeners () {
  logOutUser('.logoutuser_link')
  setUpBackToTop('review_main_wrapper')
  handleContainerScrollEffect('review_main_wrapper')
  document.querySelector('.how_to_link')?.addEventListener('click', () => {
    localStorage.setItem('userGuideShown', false)
    userGuideModel()
  })
  document.querySelector('.profile_details')?.addEventListener('click', () => {
    createAdminPage()
  })
  document.querySelector('.account_details')?.addEventListener('click', () => {
    createAccountPage()
  })
}

export async function MAIN_PAGE () {
  try {
    let pageContent = `
         <nav  class="navbar navbar__default navbar-expand-lg navbar-light light-gray-bg shadow shadow-sm glassy bg-light">
          <div class="container-fluid">
            <a class="navbar-brand text-info" href="/" title="main page">Reviewer</a>
            <button class="navbar-toggler navbar_btn" type="button" data-bs-toggle="collapse" data-bs-target="#navbarScroll" aria-controls="navbarScroll" aria-expanded="false" aria-label="Toggle navigation">
              <span class="navbar-toggler-icon"></span>
            </button>
            <div class="collapse navbar-collapse light-gray-bg " id="navbarScroll">
                <form class="d-flex doc_s_form bg-light" style="max-height:inherit !important">
                  <input id="search____input" class="form-control me-2 bg-light shadow-sm" autocomplete="off" type="search" placeholder="Search" aria-label="Search">
                </form>
                <ul id="__nav" class="navbar-nav me-auto my-2 my-lg-0 navbar-nav-scroll light-gray-bg border-1 border-danger" style="--bs-scroll-height: 150px;">
                      <li class="nav-item dropdown">
                          <a class="nav-link dropdown-toggle text-dark text-uppercase" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            account
                          </a>
                          <ul class="dropdown-menu text-dark bg-light shadow shadow-lg" style="z-index:10 !important">
                              <li><a class="dropdown-item  text-dark  account_details text-uppercase" href="#">Account details</a></li>
                              <li><a class="dropdown-item  text-dark  profile_details text-uppercase" href="#">Profile details</a></li>
                              <li><a class="dropdown-item   text-dark   how_to_link text-uppercase" href="#">How to guide</a></li>
                              <li><a class="dropdown-item   text-dark   create_profile text-uppercase" href="#">Create review profile</a></li>
                              <li><a class="dropdown-item   text-dark   logoutuser_link text-uppercase" href="#">Logout</a></li>
                          </ul>
                      </li>
                      <li class="nav-item dropdown">
                          <a class="nav-link dropdown-toggle text-dark text-uppercase" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                            sites
                          </a>
                          <ul class="dropdown-menu bg-light overflow-auto  _inner_dropdown_canvas  shadow shadow-lg" style="max-height: 350px;">
                            <li><a class="dropdown-item  btn btn-outline-success text-dark text-uppercase  google-com" href="#">google-com</a></li>
                            <li><a class="dropdown-item  btn btn-outline-success text-dark text-uppercase  agoda-com" href="#">agoda-com</a></li>
                            <li><a class="dropdown-item  btn btn-outline-success text-dark text-uppercase  booking-com" href="#">booking-com</a></li>
                            <li><a class="dropdown-item  text-dark text-uppercase  expedia-com" href="#">expedia-com</a></li>
                            <li><a class="dropdown-item text-dark text-uppercase trip-com" href="#">trip-com</a></li>
                            <li><a class="dropdown-item text-dark text-uppercase ctrip-com" href="#">ctrip-com</a></li>
                            <li><a class="dropdown-item  text-dark text-uppercase hotels-com" href="#">hotels-com</a></li>
                            <li><a class="dropdown-item text-dark text-uppercase  travelocity-com" href="#">travelocity-com</a></li>
                            <li><a class="dropdown-item text-dark text-uppercase trivago-com" href="#">trivago-com</a></li>
                            <li><a class="dropdown-item text-dark text-uppercase  cheaptickets-com" href="#">cheaptickets-com</a></li>
                            <li><a class="dropdown-item text-dark text-uppercase orbitz-com" href="#">orbitz-com</a></li>
                            <li><a class="dropdown-item text-dark text-uppercase wotif-com" href="#">wotif-com</a></li>
                          </ul>
                      </li>
                </ul>
                <div class="container subb_head_ing d-flex justify-content-center align-content-center">
                <a class="lead btn btn-outline-secondary btn-lg text-uppercase" href="/" style="border-color: transparent !important;"></a>
                </div>
        
            </div>
          </div>
        </nav>
        <main>     
        <div id="review_main_wrapper"  class="container review__wrapper"> 
        </div>
        </main>
      `
    document.getElementById('innerBody').innerHTML = pageContent
    setupEventListeners()
    await handlePaginatedDataAllAccounts()
    await handleReviewButtonsEvents()
    await superManHandle()
    await setupDropdownHover()
    await roadRunners()
    await finishSetup()
    await handleProfileGenerator('.create_profile')
    return true
  } catch (e) {
    console.log(e)
    return false
  }
}
