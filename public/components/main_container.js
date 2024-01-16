import { PLUGINS } from '../utils/plugins.js'
const {
  logOutUser,
  setUpBackToTop,
  roadRunners,
  userGuideModel,
  setupDropdownHover,
  handleProfileGenerator,
  superManHandle,
  createAdminPage,
  handleReviewButtonsEvents,
  handlePaginatedDataAllAccounts
} = PLUGINS

export async function MAIN_PAGE () {
  let pageContent = `
       <nav  class="navbar navbar__default navbar-expand-lg navbar-dark dark-gray-bg shadow glassy">
        <div class="container-fluid">
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
                        <a class="nav-link dropdown-toggle text-white text-uppercase" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                          account
                        </a>
                        <ul class="dropdown-menu dark-gray-bg border-3 border-secondary" style="z-index:10 !important">
                            <li><a class="dropdown-item dropdown-item-dark text-warning  account_details text-uppercase" href="#">Account details</a></li>
                            <li><a class="dropdown-item dropdown-item-dark text-warning  profile_details text-uppercase" href="#">Profile details</a></li>
                            <li><a class="dropdown-item  dropdown-item-dark text-warning   how_to_link text-uppercase" href="#">How to guide</a></li>
                            <li><a class="dropdown-item  dropdown-item-dark text-warning   create_profile text-uppercase" href="#">Create review profile</a></li>
                            <li><a class="dropdown-item  dropdown-item-dark text-warning   logoutuser_link text-uppercase" href="#">Logout</a></li>
                        </ul>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle text-white text-uppercase" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                          sites
                        </a>
                        <ul class="dropdown-menu _inner_dropdown_canvas dark-gray-bg border-3 border-secondary">
                          <li><a class="dropdown-item dropdown-item-dark btn btn-outline-success text-warning text-uppercase  google-com" href="#">google-com</a></li>
                          <li><a class="dropdown-item dropdown-item-dark btn btn-outline-success text-warning text-uppercase  agoda-com" href="#">agoda-com</a></li>
                          <li><a class="dropdown-item dropdown-item-dark btn btn-outline-success text-warning text-uppercase  booking-com" href="#">booking-com</a></li>
                          <li><a class="dropdown-item dropdown-item-dark btn btn-outline-success text-warning text-uppercase  ctrip-com" href="#">ctrip-com</a></li>
                          <li><a class="dropdown-item dropdown-item-dark btn btn-outline-success text-warning text-uppercase  tripadvisor-com" href="#">tripadvisor-com</a></li>
                          <li><a class="dropdown-item dropdown-item-dark text-warning text-uppercase  expedia-com" href="#">expedia-com</a></li>
                        </ul>
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
  document.querySelector('.profile_details')?.addEventListener('click', () => {
    createAdminPage()
  })
  handlePaginatedDataAllAccounts()
  handleReviewButtonsEvents()
  superManHandle()
  setupDropdownHover()
  roadRunners()
  handleProfileGenerator('.create_profile')
}
