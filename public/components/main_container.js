import { PLUGINS } from '../utils/plugins.js'
const {
  simpleLoader,
  handleNavbarUpdate,
  runSpinner,
  logOutUser,
  setUpBackToTop,
  PaginateData,
  roadRunners,
  userGuideModel,
  setupDropdownHover,
  handleReviewButtonsEvents,
  handlePaginatedDataAllAccounts
} = PLUGINS

export async function MAIN_PAGE () {
  let pageContent = `
       <nav  class="navbar navbar__default navbar-expand-lg navbar-dark dark-gray-bg shadow glassy">
        <div class="container container-fluid">
          <a class="navbar-brand" href="#" title="main page">Reviewer</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarScroll" aria-controls="navbarScroll" aria-expanded="false" aria-label="Toggle navigation">
            <span class="navbar-toggler-icon"></span>
          </button>
          <div class="collapse navbar-collapse dark-gray-bg " id="navbarScroll">
              <form class="d-flex doc_s_form" style="max-height:inherit !important">
                <input id="search____input" class="form-control me-2" autocomplete="off" type="search" placeholder="Search" aria-label="Search">
              </form>
              <ul id="__nav" class="navbar-nav me-auto my-2 my-lg-0 navbar-nav-scroll dark-gray-bg border-1 border-danger" style="--bs-scroll-height: 150px;">
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle text-white" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                      Account
                    </a>
                    <ul class="dropdown-menu dark-gray-bg text-lght border-2 border-secondary">
                      <li><a class="dropdown-item dropdown-item-dark text-white  account_details" href="#">Account details</a></li>
                      <li><a class="dropdown-item  dropdown-item-dark text-white   how_to_link" href="#">How to</a></li>
                      <li><a class="dropdown-item  dropdown-item-dark text-white   logoutuser_link" href="#">Logout</a></li>
                    </ul>
                </li>
                <li class="nav-item dropdown">
                    <a class="nav-link dropdown-toggle text-white" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                      Sites
                    </a>
                    <ul class="dropdown-menu _inner_dropdown_canvas dark-gray-bg border-2 border-secondary">
                    <li><a class="dropdown-item dropdown-item-dark text-white  google-com" href="#">google-com</a></li>
                    <li><a class="dropdown-item dropdown-item-dark text-white  booking-com" href="#">booking-com</a></li>
                    <li><a class="dropdown-item dropdown-item-dark text-white  agoda-com" href="#">agoda-com</a></li>
                    <li><a class="dropdown-item dropdown-item-dark text-white  ctrip-com" href="#">ctrip-com</a></li>
                    <li><a class="dropdown-item dropdown-item-dark text-white  tripadvisor-com" href="#">tripadvisor-com</a></li>
                    <li><a class="dropdown-item dropdown-item-dark text-white  expedia-com" href="#">expedia-com</a></li>
                    </ul>
                </li>
                <li class="nav-item">
                  <a class="nav-link text-white" href="#" role="button">
                    Profiles
                  </a>
                </li>
              </ul>
          </div>
        </div>
      </nav>
      <main>
      <div id="review_main_wrapper"  class="container review__wrapper"></div>
      </main>
    `
  document.getElementById('innerBody').innerHTML = pageContent
  logOutUser('.logoutuser_link')
  setUpBackToTop('review_main_wrapper')
  document.querySelector('.how_to_link')?.addEventListener('click', () => {
    localStorage.setItem('userGuideShown', false)
    userGuideModel()
  })
  handlePaginatedDataAllAccounts()
  handleReviewButtonsEvents()
  setupDropdownHover()
  roadRunners()
}
