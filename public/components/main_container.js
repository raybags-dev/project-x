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
  createAccountPage,
  handleReviewButtonsEvents,
  handlePaginatedDataAllAccounts
} = PLUGINS

export async function MAIN_PAGE () {
  let pageContent = `
       <nav  class="navbar navbar__default navbar-expand-lg navbar-light light-gray-bg shadow shadow-sm glassy bg-light">
        <div class="container-fluid">
          <a class="navbar-brand" href="/" title="main page">Reviewer</a>
          <button class="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarScroll" aria-controls="navbarScroll" aria-expanded="false" aria-label="Toggle navigation">
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
                        <ul class="dropdown-menu text-dark shadow shadow-lg" style="z-index:10 !important">
                            <li class="shadow shadow-sm"><a class="dropdown-item dropdown-item-light text-dark  account_details text-uppercase" href="#">Account details</a></li>
                            <li class="shadow shadow-sm"><a class="dropdown-item dropdown-item-light text-dark  profile_details text-uppercase" href="#">Profile details</a></li>
                            <li class="shadow shadow-sm"><a class="dropdown-item  dropdown-item-light text-dark   how_to_link text-uppercase" href="#">How to guide</a></li>
                            <li class="shadow shadow-sm"><a class="dropdown-item  dropdown-item-light text-dark   create_profile text-uppercase" href="#">Create review profile</a></li>
                            <li class="shadow shadow-sm"><a class="dropdown-item  dropdown-item-light text-dark   logoutuser_link text-uppercase" href="#">Logout</a></li>
                        </ul>
                    </li>
                    <li class="nav-item dropdown">
                        <a class="nav-link dropdown-toggle text-dark text-uppercase" href="#" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                          sites
                        </a>
                        <ul class="dropdown-menu _inner_dropdown_canvas bg-light-custom3 shadow shadow-lg">
                          <li class="shadow shadow-sm"><a class="dropdown-item dropdown-item-light btn btn-outline-success text-dark text-uppercase  google-com" href="#">google-com</a></li>
                          <li class="shadow shadow-sm"><a class="dropdown-item dropdown-item-light btn btn-outline-success text-dark text-uppercase  agoda-com" href="#">agoda-com</a></li>
                          <li class="shadow shadow-sm"><a class="dropdown-item dropdown-item-light btn btn-outline-success text-dark text-uppercase  booking-com" href="#">booking-com</a></li>
                          <li class="shadow shadow-sm"><a class="dropdown-item dropdown-item-light btn btn-outline-success text-dark text-uppercase  tripadvisor-com" href="#">tripadvisor-com</a></li>
                          <li class="shadow shadow-sm"><a class="dropdown-item dropdown-item-light text-dark text-uppercase  expedia-com" href="#">expedia-com</a></li>
                          <li class="shadow shadow-sm"><a class="dropdown-item dropdown-item-light text-dark text-uppercase  ctrip-com" href="#">ctrip-com</a></li>
                          <li class="shadow shadow-sm"><a class="dropdown-item dropdown-item-light text-dark text-uppercase  hotels-com" href="#">hotels-com</a></li>
                          <li class="shadow shadow-sm"><a class="dropdown-item dropdown-item-light text-dark text-uppercase  trip-com" href="#">trip-com</a></li>
                        </ul>
                    </li>
              </ul>
          </div>
        </div>
      </nav>
      <main>     
      <div id="review_main_wrapper"  class="container review__wrapper"> 
      </div>
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
  document.querySelector('.account_details')?.addEventListener('click', () => {
    createAccountPage()
  })
  await handlePaginatedDataAllAccounts()
  await handleReviewButtonsEvents()
  await superManHandle()
  await setupDropdownHover()
  await roadRunners()
  await handleProfileGenerator('.create_profile')
}
