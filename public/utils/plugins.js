import { LOGIN_HTML } from '../components/login.js'
import { SIGNUP_HTML } from '../components/signup.js'
import { siteLogos } from '../components/logoPaths.js'
export const PLUGINS = {
  API_CLIENT: async function () {
    const apiClient = axios.create({
      baseURL: '/raybags/v1/review-crawler',
      timeout: 150000
    })

    apiClient.interceptors.response.use(
      response => response,
      error => {
        if (error.response) {
          const { status, data } = error.response
          if (status === 401) {
            sessionStorage.removeItem('user')
            sessionStorage.removeItem('redirected')
            PLUGINS.displayLabel([
              'review_main_wrapper',
              'alert-danger',
              `Invalid login credentials. Please try again!`
            ])
          }
        }
        return Promise.reject(error)
      }
    )
    return apiClient
  },
  previousTextContent: null,

  simpleLoader: async function (anchor, isLoading) {
    if (!anchor && !isLoading) {
      const shouldBeRemoved = document.getElementById('spinner-container')
      shouldBeRemoved && shouldBeRemoved.remove()
    }
    const containerId = 'spinner-container'
    if (isLoading) {
      if (!document.getElementById(containerId)) {
        const spinnerContainer = document.createElement('div')
        spinnerContainer.id = containerId
        spinnerContainer.style.position = 'absolute'
        spinnerContainer.style.top = '0'
        spinnerContainer.style.left = '0'
        spinnerContainer.style.width = '100%'
        spinnerContainer.style.height = '100%'
        spinnerContainer.style.display = 'flex'
        spinnerContainer.style.justifyContent = 'center'
        spinnerContainer.style.alignItems = 'center'
        spinnerContainer.style.zIndex = '1000'
        spinnerContainer.style.backgroundColor = 'rgba(255, 255, 255, 0.02)'
        spinnerContainer.style.backdropFilter = 'blur(1px)'

        const spinner = document.createElement('div')

        spinner.className = 'spinner-border'
        spinner.style.width = '1.5rem'
        spinner.style.height = '1.5rem'
        spinner.setAttribute('role', 'status')

        const spinnerText = document.createElement('span')
        spinnerText.className = 'visually-hidden'
        spinnerText.textContent = 'Loading...'

        spinner.appendChild(spinnerText)
        spinnerContainer.appendChild(spinner)

        const anchorContainer = document.querySelector(anchor)

        if (anchorContainer) {
          anchorContainer.style.position = 'relative'
          anchorContainer.appendChild(spinnerContainer)
        }
        anchorContainer?.setAttribute('disabled', 'true')
      }
    } else {
      const anchorContainer = document.querySelector(anchor)
      if (anchorContainer) {
        anchorContainer.removeAttribute('disabled')
      }

      const spinnerContainer = document.getElementById(containerId)
      if (spinnerContainer) {
        spinnerContainer?.remove()
      }
    }
  },
  createSubratings: async function (subratingsArray, selector) {
    const cardBody = document.querySelector(selector)

    if (subratingsArray && subratingsArray?.length > 0) {
      subratingsArray.forEach(subrating => {
        const { key, value } = subrating
        const totalStars = 5

        const spanElement = document.createElement('small')
        spanElement.classList.add('text-warning')

        const smallElement = document.createElement('small')
        smallElement.classList.add('text-light', 'text-muted')
        smallElement.textContent = `${key}: `

        const starsElement = document.createElement('span')

        // Loop through all 5 stars
        for (let i = 1; i <= totalStars; i++) {
          const star = document.createElement('span')
          star.style.opacity = '0.8'

          if (i <= value) {
            star.innerHTML = '&bigstar;'
            star.style.color = '#FFCF81'
          } else {
            star.innerHTML = '&bigstar;'
            star.style.color = '#fdffabb3'
          }

          starsElement.appendChild(star)
        }

        spanElement.appendChild(smallElement)
        spanElement.appendChild(starsElement)

        cardBody?.appendChild(spanElement)
      })
    }
  },
  runSpinner: async function (isDone, message = '') {
    const loader = document.querySelector('#main-page-loader')
    if (!isDone) {
      if (!loader) {
        const loaderHTML = `
            <div id="main-page-loader" class="d-flex align-items-center text-white justify-content-center"
              style="position:fixed; top:0; left:0; right:0; bottom:0;z-index:3000">
              <div class="d-flex">
                <p class="fs-4" id="my_text" style="position:absolute;top:50%;opacity:.8;left:50%;transform:translate(-50%, -50%);text-shadow:1px 1px 1px #000000;">
                  ${message}
                </p>
                <span class="loader text-white" style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);"></span>
              </div>
            </div>
          `
        const wrapper = document.querySelector('body')
        wrapper.insertAdjacentHTML('beforeend', loaderHTML)
      }
    } else {
      if (loader) {
        loader.remove()
      }
    }
  },
  formatDate: function (timestamp) {
    const date = new Date(timestamp)
    const year = date.getUTCFullYear()
    const month = String(date.getUTCMonth() + 1).padStart(2, '0')
    const day = String(date.getUTCDate()).padStart(2, '0')
    const hours = String(date.getUTCHours()).padStart(2, '0')
    const minutes = String(date.getUTCMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },
  addReviewResponse: function (
    responseObject = {},
    response_anchor,
    hasPropertyResponse,
    _id
  ) {
    try {
      if (responseObject && responseObject.body?.length !== null) {
        const { body: responseBody, responseDate, author } = responseObject

        const reviewContainer = document.querySelector(response_anchor)
        if (reviewContainer) {
          const accordionElement = document.createElement('div')
          accordionElement.className =
            'accordion accordion-flush bg-dark res_body shadow'
          accordionElement.id = _id

          const accordionItem = document.createElement('div')
          accordionItem.className = 'accordion-item bg-dark'
          accordionItem.dataset.parent = `#${_id}`

          const accordionHeader = document.createElement('h2')
          accordionHeader.className = 'accordion-header'
          accordionHeader.id = `flush-heading-${_id}`

          const accordionButton = document.createElement('button')
          accordionButton.className =
            'accordion-button dark-gray-bg text-light shadow-sm collapsed'
          accordionButton.type = 'button'
          accordionButton.setAttribute('data-bs-toggle', 'collapse')
          accordionButton.setAttribute(
            'data-bs-target',
            `#flush-collapse-${_id}`
          )
          accordionButton.setAttribute('aria-expanded', 'false')
          accordionButton.setAttribute('aria-controls', `flush-collapse-${_id}`)
          accordionButton.style.backgroundColor = '#373737 !important'
          accordionButton.innerHTML = 'Response from the owner'

          accordionHeader.appendChild(accordionButton)

          const accordionBody = document.createElement('div')
          accordionBody.id = `flush-collapse-${_id}`
          accordionBody.className = 'accordion-collapse collapse show'
          accordionBody.setAttribute('aria-labelledby', `flush-heading-${_id}`)

          const accordionBodyContent = document.createElement('div')
          accordionBodyContent.className = 'accordion-body light-gray-bg'
          accordionBodyContent.innerHTML = responseBody

          const response_date = document.createElement('p')
          response_date.className = 'container text-muted'
          response_date.innerHTML = `${
            (author && author) || 'Response posted on: '
          }&nbsp;&nbsp; (${responseDate})`

          accordionBody.appendChild(accordionBodyContent)
          accordionBody.appendChild(response_date)

          accordionItem.appendChild(accordionHeader)
          accordionItem.appendChild(accordionBody)

          accordionElement.appendChild(accordionItem)

          hasPropertyResponse &&
            reviewContainer?.insertBefore(
              accordionElement,
              reviewContainer.firstChild
            )

          const existingElement = document.getElementById(`#${_id}`)
          if (existingElement) {
            const accordionInstance = new bootstrap.Collapse(accordionItem, {
              parent: `#${_id}`,
              toggle: false
            })
            accordionInstance.show()
          }
        }
      }
    } catch (error) {
      console.log('Error in addReviewResponse:', error.message)
    }
  },
  createRating: async function (ratingValue, selector) {
    const smallElement = document.querySelector(selector)
    if (smallElement) {
      const totalStars = 5

      const containerElement = document.createElement('span')
      containerElement.classList.add('text-muted')
      const textElement = document.createElement('small')
      textElement.textContent = 'Rating: '

      const starsElement = document.createElement('small')

      for (let i = 1; i <= totalStars; i++) {
        const star = document.createElement('span')

        if (i <= ratingValue) {
          star.innerHTML = '&bigstar;'
          star.style.color = '#65B741'
        } else {
          star.innerHTML = '&bigstar;'
          star.style.color = '#C1F2B0;'
        }

        starsElement.appendChild(star)
      }

      containerElement.appendChild(textElement)
      containerElement.appendChild(starsElement)

      smallElement.innerHTML = ''
      smallElement.appendChild(containerElement)
    }
  },
  validateSuperAdmin: async function () {
    try {
      PLUGINS.runSpinner(false, 'validating...')

      const user = PLUGINS.getAuthHandler()
      if (!user.superUserToken || !user.isSuperUser) return
      if (user) {
        const apiClient = await PLUGINS.API_CLIENT()

        const baseUrl = '/user/validate'

        const { 'auth-token': token, superUserToken } = user

        const headers = {
          Authorization: `Bearer ${token}`,
          'admin-token': superUserToken,
          'Content-Type': 'application/json'
        }

        const res = await apiClient.post(baseUrl, {}, { headers })
        if (res.status === 200 && res.statusText && res.data.state) {
          PLUGINS.runSpinner(true)
          return true
        }
        return false
      }
    } catch (error) {
      if (
        error.response &&
        error.response.status === 403 &&
        error.response.data.status === 'UNAUTHORIZED'
      ) {
        PLUGINS.runSpinner(true)
        return ''
      } else {
        console.warn('An error occurred:')
      }
    }
  },
  addSuperAdminLinkToNavbar: async function () {
    const navUl = document.getElementById('__nav')
    const userString = await PLUGINS.getAuthHandler()
    const isSuperUser = await PLUGINS.validateSuperAdmin()

    if (userString && isSuperUser) {
      const { superUserToken, isSuperUser } = userString

      if (superUserToken && isSuperUser) {
        const adminLi = document.createElement('li')
        adminLi.classList.add('nav-item', 'dropdown')

        const adminLink = document.createElement('a')
        adminLink.classList.add(
          'nav-link',
          'dropdown-toggle',
          'text-uppercase',
          'text-white'
        )
        adminLink.href = '#'
        adminLink.setAttribute('role', 'button')
        adminLink.setAttribute('data-bs-toggle', 'dropdown')
        adminLink.setAttribute('aria-expanded', 'false')
        adminLink.textContent = 'Super admin'

        const dropdownMenu = document.createElement('ul')
        dropdownMenu.classList.add(
          'dropdown-menu',
          'dark-gray-bg',
          'border-3',
          'border-secondary'
        )

        const accountsAdminTab = document.createElement('li')
        accountsAdminTab.innerHTML =
          '<a class="dropdown-item dropdown-item-dark text-light accounts-admin-tab text-uppercase" href="#">user accounts</a>'

        dropdownMenu.appendChild(accountsAdminTab)
        adminLi.appendChild(adminLink)
        adminLi.appendChild(dropdownMenu)

        navUl?.insertBefore(adminLi, navUl.firstChild)
      }
      return true
    }
  },
  superManHandle: async function () {
    try {
      const linkTabAvailable = await PLUGINS.addSuperAdminLinkToNavbar()
    } catch (e) {
      console.log('done')
    }
  },
  reviewCount: async function (countTotal, selector) {
    const container = document.querySelector(selector)

    if (container && countTotal !== undefined && countTotal !== null) {
      const spanElement = document.createElement('small')
      spanElement.classList.add('text-muted')

      const displayedCount = countTotal == 0 ? 1 : countTotal

      spanElement.innerHTML = `Review count: <small style="color: green; font-weight: 700">${displayedCount}</small>`
      container.insertBefore(spanElement, container.querySelector('br'))
    }
  },
  responseButtonVisibility: function (hasPropertyResponse, selector) {
    const button = document.querySelector(selector)

    if (button) {
      if (hasPropertyResponse) {
        button.classList.add('hide')
      } else {
        button.classList.remove('hide')
      }
    }
  },
  setAuthHandler: function (userObject, headers) {
    if (userObject && headers && headers.authorization) {
      try {
        const authToken = headers.authorization.split(' ')[1]

        const userWithoutMeta = { ...userObject, 'auth-token': authToken }

        sessionStorage.setItem('user', JSON.stringify(userWithoutMeta))

        return userWithoutMeta
      } catch (error) {
        console.error('Error parsing authorization header:', error)
      }
    }
    return null
  },
  getAuthHandler: function () {
    const userString = sessionStorage.getItem('user')
    const user = userString ? JSON.parse(userString) : null
    return user
  },
  justForAMoment: function (message = 'Loading') {
    PLUGINS.runSpinner(false, message)
    setTimeout(() => PLUGINS.runSpinner(true), 2000)
  },
  clearStorage: function (storage) {
    if (!storage) return

    if (storage === 'sessionStorage') {
      sessionStorage.clear()
      return true
    }
    if (storage === 'localStorage') {
      localStorage.clear()
      console.log('Local Storage cleared.')
      return true
    }
    return false
  },
  loginUser: async function (user) {
    if (!user || !user.email || !user.password) {
      PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-danger',
        'Invalid credentials.'
      ])
      console.error('Invalid user or credentials')
      return null
    }
    const url = '/user/login'
    try {
      const apiClient = await PLUGINS.API_CLIENT()
      const loginResponse = await apiClient.post(url, {
        email: user.email,
        password: user.password
      })
      const { user: userData } = loginResponse.data
      const { headers, status } = loginResponse

      if (status === 200) {
        await PLUGINS.setAuthHandler(userData, headers)
        sessionStorage.setItem('redirected', true)
        PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-success',
          'Login successful.'
        ])
        return loginResponse
      }
      console.log('Error in login!', loginResponse && loginResponse)
      return PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-danger',
        'Login failed!'
      ])
    } catch (error) {
      PLUGINS.runSpinner(false, 'Failed!')
      console.error('Login error:', error)
      PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-danger',
        'Login failed. PLease try to login again!'
      ])
      return error?.response
    }
  },
  logOutUser: async function (selector) {
    const cookieRef = await PLUGINS.handleCookieAcceptance()
    if (!cookieRef) return

    const BTNs = Array.from(document.querySelectorAll(selector))

    if (BTNs.length) {
      BTNs.forEach(async btn => {
        btn.addEventListener('click', async () => {
          const user = sessionStorage.getItem('user')
          if (user) {
            PLUGINS.displayLabel([
              'review_main_wrapper',
              'alert-secondary',
              'Logout successful!'
            ])

            setTimeout(() => {
              sessionStorage.removeItem('user')
              sessionStorage.removeItem('redirected')
            }, 500)
          }
          LOGIN_HTML()
        })
      })
    }
  },
  removeElementFromDOM: async function (elementAnchor) {
    try {
      const element = document.querySelector(elementAnchor)
      if (element) {
        element.remove()
      }
    } catch (e) {
      console.log(e.message)
    }
  },
  formatEmail: function (email) {
    const atIndex = email.indexOf('@')
    if (atIndex !== -1) {
      const username = email.slice(0, atIndex)
      return `@${username}`
    }
    return ''
  },
  displayLabel: async function ([anchorId, labelClass, labelText]) {
    const existingAlert = document.querySelector('.main___alert')
    if (existingAlert) {
      existingAlert.remove()
    }
    const label = document.createElement('div')
    label.classList.add('alert', labelClass, 'text-center', 'main___alert')
    label.textContent = labelText
    label.style.zIndex = 5000

    const anchor = document.getElementById(anchorId)
    if (anchor) {
      anchor.appendChild(label)
      setTimeout(() => {
        if (anchor.contains(label)) {
          anchor.removeChild(label)
        }
      }, 6000)
    } else {
      console.log(`Anchor with ID '${anchorId}' could not be found`)
    }
  },
  confirmAction: async function (containerId, message) {
    if (message === undefined || null)
      message = `This action cannot be reversed. Are you sure you want to proceed ? `
    return new Promise(resolve => {
      const modalHTML = `
        <div class="modal fade border-2 border-danger p-1" style="backdrop-filter: blur(15px) !important;" id="exampleModalToggle" aria-hidden="true" aria-labelledby="exampleModalToggleLabel" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-light-custom  text-light">
              <div class="container text-center d-flex justify-content-center align-content-center text-uppercase p-2">
                <h1 class="modal-title fs-5 text-danger" id="exampleModalToggleLabel">Danger zone</h1>
              </div>
              <div class="modal-body custome-color2">${message}</div>
              <div class="container mb-2 d-flex justify-content-around align-content-center gap-2">
                <button type="button" class="btn-lg bg-transparent btn-outline-danger w-50 proceed_delete overflow-hidden" data-bs-dismiss="modal">Proceed</button>
                <button type="button" class="btn-lg bg-transparent btn-outline-success  w-50 cancel_delete overflow-hidden" data-bs-dismiss="modal">Cancel</button>
              </div>
            </div>
          </div>
        </div>
        <a class="btn btn-transparent" id="modalToggleButton" data-bs-toggle="modal" href="#exampleModalToggle" role="button" style="display:none;"></a>`

      const container = document.querySelector(containerId)
      container?.insertAdjacentHTML('beforeend', modalHTML)

      const modal = new bootstrap.Modal(
        document.getElementById('exampleModalToggle')
      )
      modal.show()

      const confirmBtn = document.querySelector('.proceed_delete')
      confirmBtn?.addEventListener('click', async () => {
        resolve('confirmed!')
      })

      const abortBtn = document.querySelector('.cancel_delete')
      abortBtn?.addEventListener('click', async () => {
        PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-secondary',
          `This process has been aborted.`
        ])
        resolve('Aborted.')
      })
    })
  },
  handleCookieAcceptance: async function () {
    try {
      const isCookiesAccepted = localStorage.getItem('isCookiesAccepted')

      if (isCookiesAccepted === 'false' || isCookiesAccepted === null) {
        const modalHTML = `
            <div class="modal fade text-dark bg-dark" id="cookieModal"  data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="cookieModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content bg-dark shadow">
                <div class="modal-header border-0" >
                  <h1 class="modal-title fs-5 text-light m-auto text-uppercase text-muted" id="cookieModalLabel">Cookie Policy</h1>
                </div>
                <div class="modal-body">
                  <p class="text-light lead text-muted">This website uses cookies to enhance the user experience. By accepting cookies, you agree to our <a href="#" class="text-primary">Terms of Service</a> and <a href="#" class="text-primary">Privacy Policy</a>.</p>
                </div>
                <div class="container border-0 d-flex justify-content-around align-content-center gap-2 p-2">
                  <button type="button" class="btn btn-lg btn-outline-secondary w-50" id="rejectCookies" data-bs-dismiss="modal">Reject</button>
                  <button type="button" class="btn btn-lg btn-outline-success w-50" id="acceptCookies">Accept</button>
                </div>
              </div>
            </div>
          </div>
        `

        document.body.insertAdjacentHTML('beforeend', modalHTML)
        const cookieModal = new bootstrap.Modal(
          document.getElementById('cookieModal')
        )
        cookieModal.show()

        document
          .getElementById('acceptCookies')
          .addEventListener('click', () => {
            localStorage.setItem('isCookiesAccepted', 'true')
            localStorage.setItem('userGuideShown', 'false')
            cookieModal.hide()
            window.location.reload()
          })

        document
          .getElementById('rejectCookies')
          .addEventListener('click', () => {
            localStorage.setItem('isCookiesAccepted', 'false')
            PLUGINS.displayLabel([
              'body',
              'alert-danger',
              "Unfortunately, you can't use this application without consenting to the Terms of Service."
            ])

            cookieModal.hide()
            setTimeout(() => window.location.reload(), 5000)
          })

        document
          .querySelector('.c--iie-c-btn')
          .addEventListener('click', () => {
            localStorage.setItem('isCookiesAccepted', 'false')
            PLUGINS.displayLabel([
              'body',
              'alert-danger',
              "Unfortunately, you can't use this application without consenting to the Terms of Service."
            ])
            cookieModal.hide()
            setTimeout(() => window.location.reload(), 5000)
          })
      }
      return localStorage.getItem('isCookiesAccepted') === 'true'
    } catch (e) {
      console.log(e.message)
    }
  },
  handleAsyncErrors: function (callback) {
    return async function (event) {
      try {
        await callback(event)
      } catch (error) {
        console.log('An error occurred from handleAsyncErrors:', error.message)
      }
    }
  },
  setupDropdownHover: async function () {
    const dropdownItems = document.querySelectorAll('li.nav-item.dropdown')
    dropdownItems &&
      dropdownItems.forEach(
        PLUGINS.handleAsyncErrors(dropdownItem => {
          dropdownItem &&
            dropdownItem.addEventListener('mouseenter', () => {
              const navLink = dropdownItem?.querySelector('a.nav-link')
              navLink && navLink.setAttribute('aria-expanded', 'true')
              const dropdownMenu =
                dropdownItem.querySelector('ul.dropdown-menu')
              dropdownMenu && dropdownMenu.classList?.add('show')
            })

          dropdownItem &&
            dropdownItem.addEventListener('mouseleave', () => {
              const navLink = dropdownItem.querySelector('a.nav-link')
              navLink && navLink.setAttribute('aria-expanded', 'false')
              const dropdownMenu =
                dropdownItem.querySelector('ul.dropdown-menu')
              dropdownMenu && dropdownMenu.classList?.remove('show')
            })
        })
      )
  },
  fetchFromLocalStorage: async function (key) {
    try {
      const serializedData = localStorage.getItem(key)
      return serializedData ? JSON.parse(serializedData) : null
    } catch (error) {
      console.log('Error fetching from localStorage:', error)
      return null
    }
  },
  saveToLocalStorage: async function (key, data) {
    try {
      const serializedData = JSON.stringify(data)
      localStorage.setItem(key, serializedData)
    } catch (error) {
      console.log('Error saving to localStorage:', error)
    }
  },
  userGuideModel: async function () {
    const userGuideServiceModal = `
        <button type="button" class="btn btn-sm modaal_cont position-absolute"  data-bs-toggle="modal" data-bs-target="#exampleModal">
        </button>
        <div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-dialog-scrollable">
            <div class="modal-content bg-transparent text-light" style="backdrop-filter:blur(20px);border:2px solid #13283b80;">
              <div class="modal-header text-white border-0 bg-dark">
                <h5 class="modal-title text-secondary shadow-sm" id="exampleModalLabel">Welcome to REVIEW-WIZARD, \nYour One-Stop Solution for managing your guests' Management</h5>
                </div>
              <div class="modal-body text-light bg-dark">
                <ul class="text-muted">
                <p class="lead">Step 1: Sign Up</p>
                  <li>
                  On the login page, click the "Signup" button in the top right corner.
                  Fill in the required details to create your account.
                  </li>
                  <br>
                  <p class="lead">Step 2: Create Your Review Profile</p>
                  <li>
                  Navigate to Account > CREATE REVIEW ACCOUNT.
                  Provide the URL of your hotel or restaurant to (1) create a review profile.
                  </li>
                  <br>
                  <p class="lead">Step 3: Fetch Review Data</p>
                 <li>
                 Once your review profile is set up, the system will automatically fetch reviews for that particular account.
                 You can view and manage all guest feedback in one place, saving you time from visiting multiple websites.
                 </li>
                  <br>
                  <p class="lead">Step 4: Deleting Reviews</p>
                 <li>
                 In case you need to remove a review, click on the "Delete" option next to the specific review.
                 Confirm the deletion to maintain the quality of your review profile.
                 </li>
                  <br>
                  <p class="lead">Step 5: Save Time, Improve Service</p>
                 <li>
                  By centralizing this tool, you'll be able to save time that can be used to enhance your services and address specific guest needs on your property.
                  Focus on what matters most to your business.
                 </li>
                  <br>
                  <p class="lead">Thats it, You are all setup.</p>
                 <li>
                 Congratulations! You're now ready to streamline your guest feedback management and elevate your guest experience.
                 If you have any questions or need assistance, feel free to reach out to me directly.
                 </li>
                  <br>
                  <h5 class="text-center">Happy managing and improving!</h5>
                  </ul>
              </div>
              <div class="container modal-footer bg-dark d-flex border-0 justify-content-center">
                <button type="button" class="btn container btn-outline-secondary m-auto btn-lg text-center" data-bs-dismiss="modal">Close me</button>
              </div>
            </div>
          </div>
        </div>
      `
    //check if guide has been shown already
    const userGuideShown = await PLUGINS.fetchFromLocalStorage('userGuideShown')
    const cookieAccepted = await PLUGINS.fetchFromLocalStorage(
      'isCookiesAccepted'
    )

    if (!userGuideShown && cookieAccepted) {
      const container = document.getElementById('innerBody')
      container?.insertAdjacentHTML('afterbegin', userGuideServiceModal)
      setTimeout(async () => {
        const modal_btn = document.querySelector('.modaal_cont')
        modal_btn?.click()
      }, 200)
      PLUGINS.saveToLocalStorage('userGuideShown', true)
    }
  },
  hasBeenClicked: function (element) {
    let isClicked = false
    element?.addEventListener('click', e => {
      if (e.type == 'click') return true
      return false
    })

    return isClicked
  },
  setUpBackToTop: async function (mainContainerId) {
    const buttonTopInnerHTML = `<a href="#" class="back-to-top bg-transparent" aria-label="Back to Top">&uarr;</a>`

    const mainContainer = document.getElementById(mainContainerId)
    mainContainer?.insertAdjacentHTML('beforeend', buttonTopInnerHTML)
    const backToTopButton = document.querySelector('.back-to-top')

    mainContainer?.addEventListener('scroll', function () {
      if (mainContainer.scrollTop > 0) {
        backToTopButton.classList.add('show-to-top-btn')
      } else {
        backToTopButton.classList.remove('show-to-top-btn')
      }
    })

    backToTopButton?.addEventListener('click', function (e) {
      e.preventDefault()
      if (mainContainer) {
        mainContainer.scrollTo({ top: 0, behavior: 'smooth' })
      }
    })

    if (mainContainer && mainContainer.innerHTML.trim() === '') {
      backToTopButton?.classList.remove('show-to-top-btn')
    }
  },
  deleteReviewDocument: async function (documentId) {
    try {
      if (!documentId) {
        throw new Error('Invalid document ID')
      }

      PLUGINS.runSpinner(false, 'Deleting...')

      const auth = PLUGINS.getAuthHandler()
      const { 'auth-token': authToken, isAdmin, isSubscribed } = auth

      if (isAdmin && isSubscribed) {
        const headers = {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }

        const baseUrl = '/document/delete-one'
        const url = `${baseUrl}/${documentId}`

        const apiClient = await PLUGINS.API_CLIENT()
        const response = await apiClient.delete(url, { headers })

        if (response.status !== 200) {
          throw new Error(`Failed to delete review: ${response.data}`)
        }

        PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-success',
          `Review deleted successfully`
        ])
        PLUGINS.runSpinner(true)
        return true
      }
    } catch (error) {
      console.log('Error deleting document:', error.message)
      PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `An error occurred: ${error.message}`
      ])
    } finally {
      PLUGINS.runSpinner(true)
    }
  },
  getHeaders: function () {
    const auth = PLUGINS.getAuthHandler()
    const { 'auth-token': authToken, isAdmin, isSubscribed } = auth

    if (isAdmin && isSubscribed)
      return {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      }
    return {}
  },
  updateReview: async function (documentId, authorExternalId, reviewSiteSlug) {
    try {
      if (!documentId || !authorExternalId || !reviewSiteSlug) {
        throw new Error('Invalid payload')
      }

      PLUGINS.runSpinner(false)
      const headers = PLUGINS.getHeaders()

      if (headers) {
        const baseUrl = '/update-review'

        const apiClient = await PLUGINS.API_CLIENT()
        const response = await apiClient.post(
          baseUrl,
          { reviewId: documentId, authorExternalId, reviewSiteSlug },
          { headers }
        )

        if (response.status == 200) {
          let reviewObj = response.data.data[0]
          PLUGINS.displayLabel([
            'review_main_wrapper',
            'alert-success',
            `Review updated successfully`
          ])
          PLUGINS.runSpinner(true)
          return reviewObj
        }
        return false
      }
      throw new Error(`Failed to update review: ${response.data}`)
    } catch (error) {
      if (
        error.response.status === 501 &&
        error.response.statusText === 'Not Implemented'
      ) {
        PLUGINS.simpleLoader(false)

        return PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-secondary',
          `This feature has not yet been implimented: We are working in it! `
        ])
      }

      PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `An error occurred: ${error.message}`
      ])
      console.log(error.message)
    } finally {
      PLUGINS.runSpinner(true)
    }
  },
  handleReviewButtonsEvents: async function () {
    const reviewContainer = document.getElementById('review_main_wrapper')
    if (!reviewContainer) {
      console.log('Review container not found')
      return
    }
    reviewContainer.addEventListener('click', async event => {
      const clickedButton = event.target.closest('button')
      if (clickedButton) {
        // ************
        // ************
        if (clickedButton.classList.contains('action_3')) {
          const reviewId = PLUGINS.getOutermostReviewId(clickedButton)
          if (reviewId) {
            try {
              PLUGINS.simpleLoader(`[del-revie-data="${reviewId}"]`, true)

              setTimeout(async () => {
                const isDeleted = await PLUGINS.deleteReviewDocument(reviewId)

                if (isDeleted) {
                  const deletedCard = document.getElementById(`${reviewId}`)
                  deletedCard?.classList.add('delete_item')
                  setTimeout(() => deletedCard.remove(), 200)
                }
              }, 1500)
            } catch (error) {
              PLUGINS.simpleLoader(`[del-review-data="${reviewId}"]`, false)
              console.log('Error handling button click:', error.message)
            }
          }
          return
        }
        // ************
        // ************
        if (clickedButton.classList.contains('action_4')) {
          const reviewId = PLUGINS.getOutermostReviewId(clickedButton)
          const authorExternalId = PLUGINS.getAuthorExternalIdId(clickedButton)
          const reviewSiteSlug = PLUGINS.getSiteSlug(reviewId)

          if (reviewId) {
            try {
              PLUGINS.simpleLoader(`[pageid-data="${reviewId}"]`, true)

              setTimeout(async () => {
                const updatedReview = await PLUGINS.updateReview(
                  reviewId,
                  authorExternalId,
                  reviewSiteSlug
                )

                if (updatedReview) {
                  const deletedCard = document.getElementById(`${reviewId}`)
                  deletedCard?.classList.add('delete_item')
                  setTimeout(() => deletedCard.remove(), 20)
                  await PLUGINS.generateReviewCard(updatedReview, true)
                  const newCard = document.querySelector(
                    `.__${authorExternalId}`
                  )
                  const parentWrapper = document.querySelector(
                    '#review_main_wrapper'
                  )

                  if (newCard && parentWrapper) {
                    newCard.scrollIntoView({
                      behavior: 'smooth',
                      block: 'center'
                    })
                  }
                }
              }, 1500)
            } catch (error) {
              PLUGINS.simpleLoader(`[del-review-data="${reviewId}"]`, false)
              console.log('Error handling button click:', error.message)
            }
          }
          return
        }
        // ************
        // ************
      }
    })
  },
  formatDBDate: function (date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },
  getOutermostReviewId: function (buttonElement) {
    const reviewContainer = buttonElement.closest('.review-container')
    if (reviewContainer) {
      return reviewContainer.id
    }
    return null
  },
  getSiteSlug: function (reviewID) {
    const targetElement = document.getElementById(reviewID)
    if (targetElement) {
      const slug = targetElement.dataset.slug
      return slug
    } else {
      console.log('Target element not found')
      return null
    }
  },
  clearProfileForm: function () {
    const selectDropdown = document.getElementById('inputGroupSiteOptions')
    const textareaInput = document.getElementById('propertUrlInputY')
    if (selectDropdown && textareaInput) {
      selectDropdown.selectedIndex = 0
      textareaInput.value = ''
    }
    return
  },
  getAuthorExternalIdId: function (buttonElement) {
    const reviewContainer = buttonElement.closest('.review-container')
    if (reviewContainer) {
      const authorExternalIdAttribute =
        buttonElement.getAttribute('authorexternalid')

      if (authorExternalIdAttribute) {
        return authorExternalIdAttribute.trim()
      }
    }
    return null
  },
  getSiteLogoPath: async function (reviewSiteSlug, uuid) {
    const siteLogo = Object.values(siteLogos).find(
      logo => logo.slug === reviewSiteSlug
    )
    if (siteLogo) {
      const cardLogo = await document.querySelector(uuid)
      if (cardLogo) {
        cardLogo.src = siteLogo.logopath
      }
    }
  },
  generateLeftContainerContent: async function (dataArray, authorExternalId) {
    const container = document.querySelector(
      `.left__body[data-subratings="${authorExternalId}"]`
    )
    if (!container) return console.log('Container not found')

    dataArray.forEach((dataObject, index) => {
      try {
        if (!dataObject || typeof dataObject !== 'object') {
          console.log(`Invalid object at index ${index}. Skipping append.`)
          return
        }
        const { key, value } = dataObject
        if (!key || !value) return

        const displayValue = value === false ? 'No' : value
        const spanElement = document.createElement('span')
        spanElement.className = 'text text-muted'
        spanElement.innerHTML = `<small>${key}: <a href="#" style="cursor:pointer;" class="sub_link text-success" data-datatype="${value}">${displayValue}</a></small>`

        const brEle = container.querySelector('.linner')
        container.insertBefore(spanElement, brEle)
      } catch (error) {
        console.log(`Error appending element at index ${index}:`, error)
      }
    })
  },
  shakeAnimation: function (selector) {
    return new Promise(resolve => {
      try {
        const element = document.querySelector(selector),
          shakeClass = 'shake-animation'

        if (element) {
          element.classList.add(shakeClass)

          setTimeout(() => {
            element.classList.remove(shakeClass)
            resolve()
          }, 2000)
        } else {
          resolve()
        }
      } catch (e) {
        console.error(e.message)
        resolve()
      }
    })
  },
  profileGenerator: async function () {
    let formIsPresent = document.querySelector('#uploadForm')
    formIsPresent && formIsPresent?.remove()

    if (!formIsPresent) {
      const uploadHTML = `
          <form id="uploadForm" class="select-img-form text-danger profile_form">
          <div class="input-group mb3 input-group-lg my_inputs">
              <select class="form-select border-transparent" id="inputGroupSiteOptions" aria-label="Example select with button addon">
                <option selected>Choose site</option>
                <option value="google">google-com</option>
                <option value="agoda">agoda-com</option>
                <!--
                <option value="booking">booking-com</option>
                <option value="tripadvisor">tripadvisor-com</option>
                <option value="ctrip">ctrip-com</option>
                <option value="expedia">expedia-com</option>
                -->
              </select>
            <button class="btn btn-lg btn-outline-secondary sub__this_form" type="button" id="proertyName29">Button</button>
          </div>
    
          <div class="input-group mb3 my_inputs">
            <textarea type="text" name="propertyurl" id="propertUrlInputY" placeholder="Paste your site property review page link here... " rows="10" class="form-control" aria-label="propertyUrl"></textarea>
          </div>
        </form>`

      const container = document.querySelector('#review_main_wrapper')
      container?.insertAdjacentHTML('afterbegin', uploadHTML)

      const submit____btn = document.querySelector('.sub__this_form')
      submit____btn?.addEventListener('click', async () => {
        PLUGINS.sendCreateProfileRequest()
      })
      document.addEventListener('keydown', async event => {
        if (event.key === 'Enter') {
          event.preventDefault()
          console.log('submitted')
          PLUGINS.sendCreateProfileRequest()
        }
      })
    } else {
      formIsPresent?.remove()
    }
  },
  validateSlug: function (slug, url) {
    let httpOccurrences = 0
    let httpsOccurrences = 0

    if (url.includes('http://')) {
      httpOccurrences = (url.match(/http:\/\//g) || []).length
    }

    if (url.includes('https://')) {
      httpsOccurrences = (url.match(/https:\/\//g) || []).length
    }

    if (httpOccurrences + httpsOccurrences > 1) {
      const errorMessage =
        'Invalid charactors detected in the provided url. Use a valid url!'
      PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-danger',
        errorMessage
      ])
      PLUGINS.justForAMoment('Aborting...')
      return false
    }

    const validFormats = [`https://www.${slug}`, `https://${slug}`]

    for (const format of validFormats) {
      if (url.startsWith(format)) {
        console.log('is valid...')
        return true
      }
    }

    const errorMessage = `The provided URL does not match the selected site name (${slug}).`
    PLUGINS.displayLabel(['review_main_wrapper', 'alert-danger', errorMessage])
    PLUGINS.justForAMoment('Aborting...')
    return false
  },
  sendCreateProfileRequest: async function () {
    let slug = ''
    const user = PLUGINS.getAuthHandler()
    if (!user) return
    const { 'auth-token': token, isAdmin, _id } = user

    try {
      const formData = new FormData()

      if (!isAdmin || !token) {
        displayLabel(['main__wrapper', 'alert-danger', 'Unauthorized!'])
        return
      }

      if (token && isAdmin) {
        const apiClient = await PLUGINS.API_CLIENT()

        const defaultValue = 'Choose site'
        const siteOptions = document.getElementById('inputGroupSiteOptions')
        const selectedOption = siteOptions.querySelector('option:checked')

        if (selectedOption.value === defaultValue) {
          PLUGINS.displayLabel([
            'review_main_wrapper',
            'alert-danger',
            'You must select a site you wish to create an account for!'
          ])
          return
        }

        const siteUrl = document.querySelector('#propertUrlInputY').value.trim()

        if (!siteUrl.length) {
          PLUGINS.displayLabel([
            'review_main_wrapper',
            'alert-danger',
            'Property URL is missing. URL is required for this operation!'
          ])
          return
        }

        // Validate URL format
        const urlRegex = /^(https?:\/\/(www\.)?|www\.)\S*$/
        if (!urlRegex.test(siteUrl)) {
          PLUGINS.displayLabel([
            'review_main_wrapper',
            'alert-danger',
            'Invalid URL format. Please provide a valid URL starting with http:// or https://'
          ])
          return
        }

        PLUGINS.runSpinner(false, 'Creating...')

        formData.append('frontFacingUrl', siteUrl)
        slug = selectedOption ? selectedOption.value : ''
        const urlPart = slug ? `create-${slug}-review-profile` : ''
        const baseUrl = `/user/${urlPart}`

        const isValidRequest = PLUGINS.validateSlug(slug, siteUrl)
        if (!isValidRequest) {
          PLUGINS.shakeAnimation('#uploadForm')
          return PLUGINS.clearProfileForm()
        }

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }

        const res = await apiClient.post(baseUrl, formData, { headers })
        PLUGINS.runSpinner(true)

        if (res.status === 200) {
          PLUGINS.removeElementFromDOM('#uploadForm')
          PLUGINS.displayLabel([
            'review_main_wrapper',
            'alert-success',
            `Account profile for ${slug} has been created successfully`
          ])
          setTimeout(() => {
            PLUGINS.runSpinner(false)
            PLUGINS.displayLabel([
              'review_main_wrapper',
              'alert-success',
              `Collecting reviews for ${slug} in progress...`
            ])
          }, 2000)
          const response = await PLUGINS.fetchReviewSiteProfile(_id, slug)

          if (response.status === 200) {
            //update localsession
            await PLUGINS.fetchCurrentUserUpdateSeesionStorage()
            const data = await response.data
            if (data.length) {
              await PLUGINS.runCrawlerHandler(slug)
            }
          }
        }
      }
    } catch (error) {
      if (error.response && error.response.status === 400) {
        PLUGINS.removeElementFromDOM('#uploadForm')
        PLUGINS.runSpinner(true)
        PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-danger',
          `This account already has a ${slug} profile!`
        ])
        PLUGINS.runSpinner('Running...')
        await PLUGINS.runCrawlerHandler(slug)
        PLUGINS.runSpinner(true)
      }
    }
  },
  fetchReviewSiteProfile: async function (user_id, slug) {
    PLUGINS.runSpinner(false)
    if (!user_id) {
      PLUGINS.runSpinner(true)
      return PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `Invalid request!`
      ])
    }

    try {
      PLUGINS.runSpinner(false, 'Processing...')
      const user = PLUGINS.getAuthHandler()
      const { 'auth-token': token } = user

      const baseUrl = `/user/get-profile/${user_id}?slug=${slug}-com`
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      const apiClient = await PLUGINS.API_CLIENT()
      const response = await apiClient.post(baseUrl, {}, { headers })

      if (response.status === 200) {
        PLUGINS.runSpinner(true)
        const profile = await response
        return profile
      }
      return null
    } catch (e) {
      console.log(e.message)
      PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `Error collecting profile ${e.message} `
      ])
    }
  },
  handleProfileGenerator: async function (selector = null, hasData = true) {
    const anchor = document.querySelector(selector)
    if (anchor) {
      anchor.addEventListener('click', () => {
        return PLUGINS.profileGenerator()
      })
    }
    if (!hasData) {
      return await PLUGINS.profileGenerator()
    }
    document.addEventListener('click', e => {
      const target = e.target
      const form = document.getElementById('uploadForm')
      const profileLink = document.querySelector('.create_profile')

      if (
        form &&
        !form.contains(target) &&
        !(profileLink && profileLink.contains(target))
      ) {
        form.remove()
      }
    })
  },
  runCrawlerHandler: async function (slug, depth = 20) {
    if (!slug) return
    PLUGINS.runSpinner(false, 'Crawling...')

    try {
      const user = PLUGINS.getAuthHandler()
      if (user) {
        const apiClient = await PLUGINS.API_CLIENT()

        const baseUrl = `/user/generate-${slug}-reviews`
        const query = `?depth=${depth}`

        const { 'auth-token': token } = user

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }

        const url = `${baseUrl}${query}`
        const res = await apiClient.post(url, {}, { headers })

        PLUGINS.removeElementFromDOM('#uploadForm')

        if (res.status === 200) {
          PLUGINS.displayLabel([
            'review_main_wrapper',
            'alert-success',
            `Review data has been collected successfully!`
          ])
          setTimeout(() => location.reload(), 2000)
        } else {
          PLUGINS.displayLabel([
            'review_main_wrapper',
            'alert-warning',
            `Someting went wrong: Review data could not be collected!`
          ])
        }
      }
    } catch (e) {
      console.log(e.message)
      if (
        e &&
        e.response &&
        e.response.error &&
        e.response.error.status === 503
      ) {
        PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-danger',
          `Service unavailable, please try again later ${e.message}`
        ])
        PLUGINS.runSpinner(true)
        return
      }
    }
  },
  generateReviewCard: async function (
    reviewsDataOject = {},
    cardIsNew = false
  ) {
    if (!reviewsDataOject) return
    const _id = reviewsDataOject?._id,
      reviewSiteSlug = reviewsDataOject?.reviewSiteSlug,
      reviewPageId = reviewsDataOject?.reviewPageId,
      urlAgent = reviewsDataOject?.urlAgent,
      author = reviewsDataOject?.author,
      authorExternalId = reviewsDataOject?.authorExternalId,
      authorLocation = reviewsDataOject?.authorLocation,
      authorReviewCount = reviewsDataOject?.authorReviewCount,
      authorProfileUrl = reviewsDataOject?.authorProfileUrl,
      reviewBody = reviewsDataOject?.reviewBody,
      hasPropertyResponse = reviewsDataOject?.hasPropertyResponse,
      propertyResponse = reviewsDataOject?.propertyResponse,
      brandCheck = reviewsDataOject?.brandCheck,
      language = reviewsDataOject?.language,
      propertyProfileUrl = reviewsDataOject?.propertyProfileUrl,
      originalEndpoint = reviewsDataOject?.originalEndpoint,
      propertyName = reviewsDataOject?.propertyName,
      rating = reviewsDataOject.rating,
      replyUrl = reviewsDataOject?.replyUrl,
      stayDate = reviewsDataOject?.stayDate,
      reviewDate = reviewsDataOject?.reviewDate,
      checkInDate = reviewsDataOject?.checkInDate,
      checkOutDate = reviewsDataOject?.checkOutDate,
      title = reviewsDataOject?.title,
      userId = reviewsDataOject?.userId,
      tripType = reviewsDataOject?.tripType,
      subratings = reviewsDataOject?.subratings,
      uuid = reviewsDataOject?.uuid,
      siteId = reviewsDataOject.siteId,
      internalId = reviewsDataOject?.internalId,
      externallId = reviewsDataOject?.externallId,
      country = reviewsDataOject?.country,
      createdAt = reviewsDataOject?.createdAt,
      updatedAt = reviewsDataOject?.updatedAt,
      miscellaneous = reviewsDataOject?.miscellaneous,
      roomTypeName = miscellaneous?.roomTypeName,
      lengthOfStay = miscellaneous?.lengthOfStay,
      isExpertReviewer = miscellaneous?.isExpertReviewer

    const InnerReviewHTMLContent = `
      <div id="${_id}" class="row review-container shadow review-incoming __${authorExternalId}  m-auto ${userId}" data-reviewPageId="${reviewPageId}" data-slug="${reviewSiteSlug}">
            <div class="card text-bg-dark dark-gray-bg my-font-color  card-left" data-userId="${userId}" style="width: 22%;margin:0 !important">
                <div class="card-header shadow-none card_header">
                <img src="" style="width:30%;max-width:75px !important;min-width:57px !important" class="img-thumbnail review-logo-${uuid}-${internalId} bg-transparent" alt="...">
                </div>
                <div class="card-body d-flex flex-column left__body" data-subratings="${authorExternalId}">
                  <span class="text" data-guest-rating="rating-${authorExternalId}" data-rating="${rating}"></span>
                  <br class="linner">
                </div>
            </div>
  
            <div class="card card-${_id} text-bg-dark dark-gray-bg my-font-color card-middle" style="width:55%;">
                <div class="card-body middle__body">
                  <div class="d-flex">
                      <a class="text-secondary text-decoration-underline" target="_blank" href="${authorProfileUrl}">
                      <h5 class="card-title review-author">${
                        (author && author) || '..'
                      }</h5>
                      </a>
                      <p class="card-text review-submitted-date"><small class="text-muted fst-italic">&nbsp;&nbsp;(${PLUGINS.formatDate(
                        createdAt
                      )})</small></p>
                  </div>
                  <p class="review-body">${reviewBody}</p>
                  <p class="card-text review-submitted-date"><small class="text-muted fst-italic">Updated: ${PLUGINS.formatDate(
                    updatedAt
                  )}</small></p>
                </div>
            </div>
  
            <div class="card text-bg-light dark-gray-bg card-right" style="width: 22%;">
                <div class="card-header border-transparent shadow-none mt-1">
                <!--===================-->
                    <div class="btn-group d-block text-center align-content-center">
                        <button class="btn btn-lg text-muted  btn-outline-transparent dropdown-toggle btn-block" type="button" data-bs-toggle="dropdown" data-bs-auto-close="true" aria-expanded="false">
                          Actions
                        </button>
                        <ul class="dropdown-menu  dark-gray-bg">
                          <li><a class="dropdown-item text-light" href="#">Copye link</a></li>
                        </ul>
                    </div>
                <!--===================-->
                </div>
                <div class="d-grid gap-2 col-6 mx-auto m-auto action_buttons right__body" style="width:100%;">
                  <a class="btn btn-transparent btn-outline-secondary action_2" href="${
                    originalEndpoint || propertyProfileUrl
                  }" target="_blank"  type="button">See review on ${reviewSiteSlug}</a>
                  <button class="btn btn-transparent btn-outline-secondary action_4" pageid-data="${_id}" authorexternalid="${authorExternalId}"  type="button">Update review</button>
                  <button class="btn btn-transparent btn-outline-danger action_3" del-revie-data="${_id}"  type="button">Delete review</button>
                </div>
          </div>
      </div>`

    const parent_wrapper = document.querySelector('#review_main_wrapper')

    if (cardIsNew) {
      parent_wrapper?.insertAdjacentHTML('afterbegin', InnerReviewHTMLContent)
    } else {
      parent_wrapper?.insertAdjacentHTML('beforeend', InnerReviewHTMLContent)
    }

    PLUGINS.createSubratings(
      subratings,
      `[data-subratings="${authorExternalId}"]`
    )
    PLUGINS.createRating(
      rating,
      `[data-guest-rating="rating-${authorExternalId}"]`
    )
    PLUGINS.addReviewResponse(
      propertyResponse,
      `.card-${_id}`,
      hasPropertyResponse,
      _id
    )
    PLUGINS.responseButtonVisibility(
      hasPropertyResponse,
      `.has-response-${uuid}`
    )
    PLUGINS.reviewCount(
      authorReviewCount,
      `[data-subratings="${authorExternalId}"]`
    )
    PLUGINS.getSiteLogoPath(
      reviewSiteSlug,
      `.review-logo-${uuid}-${internalId}`
    )
    PLUGINS.generateLeftContainerContent(
      [
        { key: 'Posted', value: reviewDate },
        { key: 'Trip type', value: tripType },
        { key: 'Room type', value: roomTypeName },
        { key: 'Nights stayed', value: lengthOfStay },
        { key: 'Professional Reviewer', value: isExpertReviewer }
      ],
      authorExternalId
    )
  },
  fetchData: async function (page = 1, slug = '') {
    try {
      PLUGINS.runSpinner(false, 'loading...')

      const user = PLUGINS.getAuthHandler()
      if (user) {
        const apiClient = await PLUGINS.API_CLIENT()

        const baseUrl = '/get-user-account-review-docs'
        const perPage = 20

        const { 'auth-token': token } = user

        const headers = {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json'
        }

        const url = `${baseUrl}?slug=${slug}&page=${page}`
        const res = await apiClient.post(url, {}, { headers })

        if (res.statusText === 'OK') {
          setTimeout(() => PLUGINS.runSpinner(true), 500)
          const data = res.data.data || []

          if (data.length < perPage) {
            PLUGINS.displayLabel([
              'review_main_wrapper',
              'alert-success',
              `This is the last page: ${page}`
            ])
            return data
          }
          if (slug === '') {
            PLUGINS.displayLabel([
              'review_main_wrapper',
              'alert-success',
              `Page: ${page}`
            ])
          }
          return data
        }
      }
      return PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `An error occurred while processing your request. Please try again later`
      ])
    } catch (error) {
      if (error.response && error.response.status === 400) {
        return PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-warning',
          `Nothing found.`
        ])
      }
      if (error.response && error.response.status === 404) {
        PLUGINS.handleProfileGenerator(null, false)
        return PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-secondary',
          `No review data available. \nCreate a profile for ${slug} by submiting a url in the input above and we will take care of the rest for you.`
        ])
      }
    } finally {
      PLUGINS.runSpinner(true)
    }
  },
  PaginateData: async function (slug) {
    PLUGINS.runSpinner(false)
    PLUGINS.removeAdminContainer()
    let page = 1
    const container = document.getElementById('review_main_wrapper')

    if (!container) return
    const user = PLUGINS.getAuthHandler()
    if (!user) return

    try {
      const data = await PLUGINS.fetchData(page, slug)
      if (data && data.length) {
        for (const obj of data) {
          try {
            await PLUGINS.generateReviewCard(obj)
          } catch (e) {
            console.log(e)
          }
        }

        setTimeout(async () => {
          let loading = false
          let target = container?.children[container.children.length - 2]
          const observer = new IntersectionObserver(
            async (entries, observer) => {
              const lastEntry = entries[entries.length - 1]
              if (lastEntry.isIntersecting && !loading) {
                loading = true
                const data = await PLUGINS.fetchData(++page, slug)
                if (data && data.length) {
                  data.forEach(async obj => {
                    await PLUGINS.generateReviewCard(obj)
                  })

                  if (data.length < 20) {
                    observer.unobserve(target)
                  } else {
                    loading = false
                    observer.unobserve(target)
                    target = container.children[container.children.length - 2]
                    observer.observe(target)
                  }
                }
              }
            },
            { rootMargin: '0px 0px 100% 0px' }
          )

          const responses = document.querySelectorAll('.review-container')
          if (responses && responses.length >= 20) {
            observer.observe(target)
          }
        }, 1000)
      }
    } catch (error) {
      if (error instanceof TypeError) {
        PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-danger',
          `Sorry, an error occurred while processing your request.`
        ])
        return await LOGIN_HTML()
      }
      console.warn(error)
    } finally {
      PLUGINS.runSpinner(true)
    }
  },
  removeAdminContainer: function () {
    const container = document.querySelector('#admin_page')
    if (container) return container.remove()
  },
  handlePaginatedDataClick: async function (event) {
    try {
      PLUGINS.removeAdminContainer()
      const textContent = event.target.textContent
      try {
        const reviews = document.querySelectorAll('.review-container')
        if (reviews.length) {
          reviews.forEach(reviewContainer => reviewContainer.remove())
          await PLUGINS.PaginateData(textContent)
          return
        }
        await PLUGINS.PaginateData(textContent)
      } catch (e) {
        console.log(e.message)
      }
    } catch (e) {
      console.log(e.message)
    }
  },
  handlePaginatedDataAllAccounts: async function () {
    const cookieAccepted = await PLUGINS.fetchFromLocalStorage(
      'isCookiesAccepted'
    )
    if (!cookieAccepted) return
    const dropdownMenu = document.querySelector('._inner_dropdown_canvas')
    const links = dropdownMenu?.querySelectorAll('a')
    links?.forEach(link => {
      link.addEventListener('click', PLUGINS.handlePaginatedDataClick)
    })
  },
  roadRunners: async function () {
    await PLUGINS.PaginateData()
  },
  createAdminProfileCard: async function (userObject, rest) {
    if (!userObject) return

    const {
      name: propertyName,
      slug,
      originalUrl,
      propertyType,
      _id: profile_id
    } = userObject
    const {
      email,
      isAdmin,
      isSubscribed,
      name: accountName,
      userId,
      _id: account_id,
      'auth-token': authToken
    } = rest

    const profileCardHTML = `
    <div id="${profile_id}" class="card admin-card bg-light-custom shadow user-${account_id}" style="min-width:250px; width:30%; max-width: 25rem;">
    <div class="card-header deem-text d-flex justify-content-between align-content-center">
        <h4 class="lead text-uppercase deem-text">${slug || ''}</h4>
      </div>
      <div class="card-body custome-color2 d-block justify-content-around align-content-center">
          <div class="container d-block">
          <p class="card-title text-uppercase">Property:</p>
          <span class="text-success d-block text-uppercase">${propertyName}</span>
          </div>
          <hr>
          <div class="container d-block">
          <p class="card-text text-uppercase ">Account email:</p>
          <span class="text-success d-block">${email}</span>
          </div>
          <hr>
          <div class="container d-block">
          <p class="card-text text-uppercase">Account name:</p>
          <span class="text-success d-block text-uppercase">${accountName}</span>
          </div>
          <hr>
          <div class="container d-flex justify-content-between align-content-center">
          <p class="card-text text-uppercase">Property type: </p>
          <span class="text-success d-block text-uppercase ">${propertyType}</span>
          </div>
          <hr>
          <div class="container d-flex justify-content-between align-content-center">
          <p class="card-text text-uppercase">Property Page:</p>
          <a class="text-decoration-underline text-uppercase fa-1x text-success d-block" style="font-size:15px" href="${originalUrl}" target="_blank">visit page</a>
          </div>
          <hr>
          <div class="container d-flex justify-content-between align-content-center">
          <p class="card-text text-uppercase">Administrator:</p>
          <span class="text-uppercase text-success">${
            (isAdmin && 'Yes') || 'No'
          }</span>
          </div>
          <hr>
          <div class="container d-flex justify-content-between align-content-center">
          <p class="card-text text-uppercase">Subscription active:</p>
          <span class="text-uppercase text-success _subscription">${
            (isSubscribed && 'Yes') || 'No'
          }</span>
          </div>
    </div>
    <div class="card-footer d-flex justify-content-between align-content-center">
        <div class="btn-group" role="group">
            <button type="button" class="btn btn-outline-success w-50 dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
              Actions
            </button>
            <ul class="dropdown-menu bg-dark text-dark shadow">
              <li class="d-flex justify-content-between align-content-center" style="width: 100% !important;height:50%;z-index:50 !important">
                  <a class="dropdown-item text-light text-decoration-underline" href="#">Run Crawler</a>
                  <div class="container">
                    <div class="form-check text-muted crawl-${profile_id}">
                        <label class="form-check-label" for="gridCheck">full</label>
                        <input class="form-check-input text-dark" data-full="${profile_id}" type="checkbox" id="gridCheck">
                    </div>
                    <div class="form-group d-flex p-2 gap-2 justify-content-between align-content-center">
                        <label for="pagesInput" class="text-light text-muted">Pages</label>
                        <div class="text-light">
                            <input type="number" data-page="${profile_id}" style="color:#000000; width:inherit;" class="form-control active bg-light-custom pagesInput  text-light" id="pagesInput" name="pages" value="1">
                        </div>
                    </div>
                  </div>
              </li>
            </ul>
        </div>
        <div class="btn-group" role="group">
            <button type="button" class="btn btn-outline-danger w-50 dropdown-toggle shadow" data-bs-toggle="dropdown" aria-expanded="false">
              Danger zone
            </button>
            <ul class="dropdown-menu bg-dark text-light">
              <li class="d-flex justify-content-between align-content-center shadow">
                <a class="dropdown-item text-danger del_all_reviews" href="#">Delete profile & reviews</a>
                  
              </li>
              <li><a class="dropdown-item text-danger del_entire_account" href="#">Delete entire account</a></li>
            </ul>
        </div>
    </div>
  </div>  
    `

    const parent_wrapper = document.querySelector('#admin_page')
    parent_wrapper?.insertAdjacentHTML('beforeend', profileCardHTML)

    const checkbox = document.querySelector(`[data-full="${profile_id}"]`)
    const numberInput = document.querySelector(`[data-page="${profile_id}"]`)

    if (checkbox && numberInput) {
      checkbox.addEventListener('change', async function () {
        numberInput.disabled = !numberInput.disabled
        numberInput.value = 0
      })
    }
    const del_review_btns = document.querySelectorAll('.del_all_reviews')
    const del_account = document.querySelectorAll('.del_entire_account')
    del_review_btns.forEach(btn => {
      btn.addEventListener('click', async e => {
        try {
          const card = e.target.closest('.admin-card')
          const h4 = card.querySelector('.card-header h4')
          const slug = (h4 && h4.innerText).toLowerCase()
          const cardId = card && card.getAttribute('id')

          const confirmation = await PLUGINS.confirmAction(
            '#body',
            `Caution: You are about to delete your account. By confirming account deletion with button 'Proceed', you acknowledge that all your account details, including account data, profiles and associated reviews, will be permanently erased. This irreversible action is not recoverable. Once confirmed, you will lose access to your account, and all data will be unrecoverable. Are you certain you want to proceed with the deletion?`
          )
          if (confirmation === 'confirmed!') {
            const deletedProfile =
              await PLUGINS.deletProfileAndAssociatedReviews(slug, cardId)
            if (deletedProfile) {
              await PLUGINS.fetchCurrentUserUpdateSeesionStorage()
              const deletedProfileCard = document.getElementById(`${cardId}`)
              deletedProfileCard.remove()
              PLUGINS.runSpinner(true)
            }
          }
        } catch (e) {
          console.log(e.message)
          PLUGINS.displayLabel([
            'review_main_wrapper',
            'alert-danger',
            `Something went wrong please try again later`
          ])
        }
      })
    })
    del_account.forEach(btn => {
      btn.addEventListener('click', async e => {
        try {
          const confirmation = await PLUGINS.confirmAction(
            '#body',
            `Caution: You are about to delete your account. By confirming account deletion with button 'Proceed', you acknowledge that all your account details, including account data, profiles and associated reviews, will be permanently erased. This irreversible action is not recoverable. Once confirmed, you will lose access to your account, and all data will be unrecoverable. Are you certain you want to proceed with the deletion?`
          )
          if (confirmation === 'confirmed!') {
            const accountIsDeleted = await PLUGINS.deletEntireAccount()
            if (accountIsDeleted) {
              PLUGINS.displayLabel([
                'review_main_wrapper',
                'alert-secondary',
                `Sad to see you go. If you wish to use our service, you can always signup`
              ])
              setTimeout(async () => {
                await SIGNUP_HTML()
                PLUGINS.runSpinner(true)
              }, 3000)
            }
          }
        } catch (e) {
          console.log(e.message)
          PLUGINS.displayLabel([
            'review_main_wrapper',
            'alert-danger',
            `Something went wrong please try again later`
          ])
        }
      })
    })
  },
  deletProfileAndAssociatedReviews: async function (slug, profile_Id) {
    try {
      if (!slug) return
      PLUGINS.runSpinner(false, 'Deleting...')

      const user = PLUGINS.getAuthHandler()
      const { 'auth-token': token } = user

      const baseUrl = `/user/delete-own-profile-and-documents/${profile_Id}?slug=${slug}`
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      const apiClient = await PLUGINS.API_CLIENT()
      const response = await apiClient.delete(baseUrl, { headers })
      if (response.status === 200) {
        PLUGINS.runSpinner(true)

        PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-success',
          `Profile and all reviews associated with it have been deleted successfully`
        ])
        await PLUGINS.fetchCurrentUserUpdateSeesionStorage()
        return true
      } else {
        PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-danger',
          `Something went wrong! Profile could not be deleted. `
        ])
        return false
      }
    } catch (e) {
      console.log(e)
      PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `Something went wrong! Profile could not be deleted. `
      ])
    } finally {
      PLUGINS.runSpinner(true)
    }
  },
  deletEntireAccount: async function () {
    try {
      PLUGINS.runSpinner(false, 'Deleting...')

      const user = PLUGINS.getAuthHandler()
      const { 'auth-token': token } = user

      const baseUrl = '/user/purge-own-user-account'
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      const apiClient = await PLUGINS.API_CLIENT()
      const response = await apiClient.delete(baseUrl, { headers })
      if (response.status === 200) {
        PLUGINS.runSpinner(true)

        PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-success',
          `Your account has been deleted.`
        ])
        PLUGINS.clearStorage('sessionStorage')
        PLUGINS.clearStorage('localStorage')
        return true
      } else {
        PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-danger',
          `Something went wrong! Profile could not be deleted. `
        ])
        return false
      }
    } catch (e) {
      console.log(e)
      PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `Something went wrong! account could not be deleted.`
      ])
    } finally {
      PLUGINS.runSpinner(true)
    }
  },
  createAdminPage: async function () {
    const pageAlreadyExists = document.querySelector('#admin_page')
    if (pageAlreadyExists)
      return PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-success',
        `You are already on the admin page.`
      ])

    const adminHTMLContent = `
    <div id="admin_page" class="container d-flex justify-content-center pt-3 flex-grow-1 align-content-center flex-wrap gap-2"></div>
    `
    const parent_wrapper = document.querySelector('#review_main_wrapper')
    if (parent_wrapper) {
      parent_wrapper.innerHTML = adminHTMLContent
    }

    document.body.addEventListener('click', async e => {
      const clickedOutsideProfileCard =
        !e.target.closest('.admin-card') &&
        !e.target.closest('.profile_details')
      if (clickedOutsideProfileCard) {
        location.reload()
      }
    })
    // up[date profile storage
    await PLUGINS.fetchCurrentUserUpdateSeesionStorage()
    const { profiles, ...rest } = await PLUGINS.getAuthHandler()

    if (!profiles.length)
      return PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-warning',
        `No profiles could be found. You can create profiles for review sites through the menu tab`
      ])
    for (let i = 0; i < profiles.length; i++) {
      const userObject = profiles[i]
      const delay = i * 100

      await new Promise(resolve => setTimeout(resolve, delay))
      await PLUGINS.createAdminProfileCard(userObject, rest)
    }
  },
  createAccountPage: async function () {
    const isContainerInDOM = document.querySelector('#userAccount')
    if (isContainerInDOM) isContainerInDOM.remove()
    try {
      let user = {}
      const userLocalStorage = await PLUGINS.getAuthHandler()
      const userDB = await PLUGINS.fetchCurrentUserUpdateSeesionStorage()

      userDB ? (user = userDB) : (user = userLocalStorage)

      if (user && Object.keys(user).length > 0) {
        const {
          _id,
          name: propertyName,
          email,
          isAdmin,
          isSubscribed,
          profiles
        } = user

        return new Promise(resolve => {
          const userAccountModal = `
      <div class="modal fade" id="userAccount" tabindex="-1" data-bs-backdrop="static" aria-labelledby="userAccountLabel" aria-hidden="true" style="backdrop-filter:blur(3px);">
        <div class="modal-dialog modal-dialog-scrollable modal-dialog-centered bg-transparent">
          <div class="modal-content bg-transparent text-light border-4 custome-color3" style="backdrop-filter:blur(30px);border-radius:.8rem;">
                <div class="card bg-light-custom custome-color2 h-100 w-100">
                  <div class="card-body bg-light-custom  border-transparent">
                    <h3 class="card-title">Account name: ${propertyName}</h3>
                    <p class="card-text">Email: ${email}</p>
                    <p class="card-text">Admin: ${
                      (isAdmin && 'Yes') || 'No'
                    }</p>
                    <p class="card-text">Subscription:  ${
                      (isSubscribed && 'Active') || 'Inactive'
                    }</p>
                    <div class="row profile__container bg-light-custom gap-3"></div>
                  </div>
                  <div class="container d-flex justify-content-around align-content-center gap-2">
                    <button type="button" class="btn  btn-outline-secondary m-auto border-1 btn-lg mt-1 mb-3 w-50" data-bs-dismiss="modal">Exit</button>
                    <button type="button" class="btn  btn-outline-danger m-auto border-1 btn-lg mt-1 mb-3 w-50 del_account__btn">Delete account</button>
                  </div>
                </div>
          </div>
        </div>
      </div>`
          const container = document.querySelector('body')
          container?.insertAdjacentHTML('beforeend', userAccountModal)

          const modal = new bootstrap.Modal(
            document.getElementById('userAccount')
          )
          PLUGINS.runSpinner(false, 'Fetching...')
          setTimeout(() => {
            modal.show()
            PLUGINS.runSpinner(true)
            PLUGINS.runSpinner(false, 'Finishing...')
            setTimeout(() => {
              PLUGINS.runSpinner(true)
              PLUGINS.displayLabel([
                'review_main_wrapper',
                'alert-success',
                `Success. These are the profiles available in your account`
              ])
            }, 1000)
          }, 1000)
          const profileContainer = document.querySelector('.profile__container')

          if (!profileContainer) {
            console.error(`container "${containerSelector}" not found.`)
            return
          }
          profiles &&
            profiles.forEach(object => {
              const card = createCard(object)
              profileContainer.appendChild(card)
            })

          function createCard (object) {
            if (!object)
              return PLUGINS.displayLabel([
                'review_main_wrapper',
                'alert-danger',
                `You dont have any profiles sofur!`
              ])
            const {
              _id: profileId,
              name: profileName,
              originalUrl,
              propertyType
            } = object
            const card = document.createElement('div')
            card.classList.add('w-100')

            const cardBody = document.createElement('div')
            cardBody.classList.add('card', 'bg-light-custom', 'custome-color3')

            const cardContent = `
              <div class="card-body bg-light-custom2">
                  <h5 class="card-title">${profileName}</h5>
                  <p>ID: ${profileId} </p>
                  <p>Property type: ${propertyType} </p>
                  <p class="card-text">${
                    object.description || 'No description available.'
                  }</p>
                  <a href="${
                    originalUrl || '#'
                  }" class="btn btn-outline-secondary" target="_blunk">Visit review Site</a>
              </div>`
            cardBody.innerHTML = cardContent
            card.appendChild(cardBody)
            return card
          }

          const profDelbtn = document.querySelector('.del_account__btn')
          profDelbtn &&
            profDelbtn.addEventListener('click', async e => {
              const confirmation = await PLUGINS.confirmAction(
                '#body',
                `Caution: You are about to delete your account. By confirming account deletion with button 'Proceed', you acknowledge that all your account details, including account data, profiles and associated reviews, will be permanently erased. This irreversible action is not recoverable. Once confirmed, you will lose access to your account, and all data will be unrecoverable. Are you certain you want to proceed with the deletion?`
              )
              if (confirmation === 'confirmed!') {
                const isDeleted = await PLUGINS.deletEntireAccount()
                if (isDeleted) {
                  document.querySelector('.modal-backdrop')?.remove()
                  document.querySelector('#userAccount')?.remove()
                  PLUGINS.displayLabel([
                    'review_main_wrapper',
                    'alert-secondary',
                    `Sad to see you go. If you wish to use our service, you can always signup`
                  ])
                  setTimeout(async () => {
                    await SIGNUP_HTML()
                    PLUGINS.runSpinner(true)
                  }, 3000)
                }
              }
            })
        })
      }

      PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `You dont see to have any profiles currently. `
      ])
    } catch (e) {
      console.log(e)
    }
  },
  fetchCurrentUserUpdateSeesionStorage: async function () {
    try {
      PLUGINS.runSpinner(false, 'Processing...')
      const user = PLUGINS.getAuthHandler()
      const { 'auth-token': token } = user

      const baseUrl = `/get-user`
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      const apiClient = await PLUGINS.API_CLIENT()
      const response = await apiClient.post(baseUrl, {}, { headers })

      if (response.status === 200) {
        const authToken = headers.Authorization.split(' ')[1]
        const userWithoutMeta = { ...response.data, 'auth-token': authToken }
        sessionStorage.setItem('user', JSON.stringify(userWithoutMeta))
        PLUGINS.runSpinner(true)
        return response.data
      }
    } catch (e) {
      console.log(e.message)
    }
  }
}
