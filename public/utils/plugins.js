import { LOGIN_HTML } from '../components/login.js'
import { SIGNUP_HTML } from '../components/signup.js'
import { siteLogos } from '../components/logoPaths.js'
import {
  API_CLIENT,
  displayLabel,
  sendCreateProfileRequest
} from '../components/apiCallHandlers.js'
import {
  validateSuperAdmin,
  getAuthHandler,
  setAuthHandler,
  fetchCurrentUserUpdateSeesionStorage
} from '../components/auth.js'
import { runSpinner, validateSlug, removeElementFromDOM } from './utilities.js'

export const PLUGINS = {
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
        smallElement.classList.add('text-dark', 'text-muted')
        smallElement.textContent = `${key}: `

        const starsElement = document.createElement('span')

        // Loop through all 5 stars
        for (let i = 1; i <= totalStars; i++) {
          const star = document.createElement('span')
          star.style.opacity = '0.8'

          if (i <= value) {
            star.innerHTML = '&bigstar;'
            star.style.color = '#29cf00'
          } else {
            star.innerHTML = '&bigstar;'
            star.style.color = '#29cf0080'
          }

          starsElement.appendChild(star)
        }

        spanElement.appendChild(smallElement)
        spanElement.appendChild(starsElement)

        cardBody?.appendChild(spanElement)
      })
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
            'accordion accordion-flush bg-light  res_body shadow shadow-sm'
          accordionElement.id = _id

          const accordionItem = document.createElement('div')
          accordionItem.className = 'accordion-item bg-light'
          accordionItem.dataset.parent = `#${_id}`

          const accordionHeader = document.createElement('h2')
          accordionHeader.className = 'accordion-header'
          accordionHeader.id = `flush-heading-${_id}`

          const accordionButton = document.createElement('button')
          accordionButton.className =
            'accordion-button  text-dark shadow-sm collapsed'
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
          accordionBodyContent.className =
            'accordion-body bg-light light-gray-bg'
          accordionBodyContent.innerHTML = responseBody

          const response_date = document.createElement('p')
          response_date.className = 'container bg-light text-muted'
          response_date.innerHTML = responseDate
            ? `Response posted on: ${responseDate}`
            : ''

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
          star.style.color = '#29cf00'
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
  addSuperAdminLinkToNavbar: async function () {
    const navUl = document.getElementById('__nav')
    const userString = await getAuthHandler()
    const isSuperUser = await validateSuperAdmin()

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
          '<a class="dropdown-item dropdown-item-dark text-dark accounts-admin-tab text-uppercase" href="#">user accounts</a>'

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
  getAuthHandler: function () {
    const userString = sessionStorage.getItem('user')
    const user = userString ? JSON.parse(userString) : null
    return user
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

  logOutUser: async function (selector) {
    const cookieRef = await PLUGINS.handleCookieAcceptance()
    if (!cookieRef) return

    const BTNs = Array.from(document.querySelectorAll(selector))

    if (BTNs.length) {
      BTNs.forEach(async btn => {
        btn.addEventListener('click', async () => {
          const user = sessionStorage.getItem('user')
          if (user) {
            displayLabel([
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

  formatEmail: function (email) {
    const atIndex = email.indexOf('@')
    if (atIndex !== -1) {
      const username = email.slice(0, atIndex)
      return `@${username}`
    }
    return ''
  },
  confirmAction: async function (containerId, message) {
    if (message === undefined || null)
      message = `This action cannot be reversed. Are you sure you want to proceed ? `
    return new Promise(resolve => {
      const modalHTML = `
        <div class="modal fade border-2 border-danger p-1" style="backdrop-filter: blur(15px) !important;" id="exampleModalToggle" aria-hidden="false" aria-labelledby="exampleModalToggleLabel" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content shadow shadow-lg rounded bg-light-custom  text-dark">
              <div class="container text-center d-flex justify-content-center align-content-center text-uppercase p-2">
                <h1 class="modal-title fs-5 text-danger" id="exampleModalToggleLabel">Danger zone</h1>
              </div>
              <div class="modal-body">${message}</div>
              <div class="container bg-light mb-2 d-flex justify-content-around align-content-center gap-2">
                <button type="button" class="btn-lg btn-outline-danger  shadow shadow-lg rounded w-50 proceed_delete overflow-hidden" data-bs-dismiss="modal">Proceed</button>
                <button type="button" class="btn-lg btn-outline-success  shadow shadow-lg rounded  w-50 cancel_delete overflow-hidden" data-bs-dismiss="modal">Cancel</button>
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
        displayLabel([
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
            displayLabel([
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
            displayLabel([
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
            <div class="modal-content shadow shadow-lg text-dark" style="backdrop-filter:blur(20px);">
              <div class="modal-header text-white border-0 bg-light">
                <h5 class="modal-title text-secondary text-decoration-underline" id="exampleModalLabel">GET STARTED</h5>
                </div>
              <div class="modal-body text-dark bg-light">
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
              <div class="container modal-footer bg-light d-flex border-0 justify-content-center">
                <button type="button" class="btn container btn-outline-secondary m-auto btn-lg text-center shadow shadow-lg" data-bs-dismiss="modal">Close me</button>
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
    const buttonTopInnerHTML = `<a href="#" class="back-to-top shadow shadow-sm border-secondary" aria-label="Back to Top">&uarr;</a>`

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

      runSpinner(false, 'Deleting...')

      const auth = getAuthHandler()
      const { 'auth-token': authToken, isAdmin, isSubscribed } = auth

      if (isAdmin && isSubscribed) {
        const headers = {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        }

        const baseUrl = '/document/delete-one'
        const url = `${baseUrl}/${documentId}`

        const apiClient = await API_CLIENT()
        const response = await apiClient.delete(url, { headers })

        if (response.status !== 200) {
          throw new Error(`Failed to delete review: ${response.data}`)
        }

        displayLabel([
          'review_main_wrapper',
          'alert-success',
          `Review deleted successfully`
        ])
        runSpinner(true)
        return true
      }
    } catch (error) {
      console.log('Error deleting document:', error.message)
      displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `An error occurred: ${error.message}`
      ])
    } finally {
      runSpinner(true)
    }
  },
  getHeaders: function () {
    const auth = getAuthHandler()
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

      runSpinner(false)
      const headers = PLUGINS.getHeaders()

      if (headers) {
        const baseUrl = '/update-review'

        const apiClient = await API_CLIENT()
        const response = await apiClient.post(
          baseUrl,
          { reviewId: documentId, authorExternalId, reviewSiteSlug },
          { headers }
        )

        if (response.status == 200) {
          let reviewObj = response.data.data[0]
          displayLabel([
            'review_main_wrapper',
            'alert-success',
            `Review updated successfully`
          ])
          runSpinner(true)
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

        return displayLabel([
          'review_main_wrapper',
          'alert-secondary',
          `This feature has not yet been implimented: We are working in it! `
        ])
      }

      displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `An error occurred: ${error.message}`
      ])
      console.log(error.message)
    } finally {
      runSpinner(true)
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
  normalizeTravelType: function (input) {
    if (!input) return
    return input
      .replace(/[_-]/g, ' ')
      .toLowerCase()
      .replace(/\b\w/g, char => char.toUpperCase())
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
    const defaultPath = '../images/fallback.png'
    const siteLogo = Object.values(siteLogos).find(
      logo => logo.slug === reviewSiteSlug
    )
    if (siteLogo) {
      const cardLogo = await document.querySelector(uuid)
      if (cardLogo) {
        cardLogo.src = siteLogo.logopath || defaultPath
      }
      cardLogo.onerror = function () {
        this.src = defaultPath
        this.onerror = null
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

  profileGenerator: async function () {
    let formIsPresent = document.querySelector('#uploadForm')
    formIsPresent && formIsPresent?.remove()

    if (!formIsPresent) {
      const uploadHTML = `
          <form id="uploadForm" class="select-img-form shadow shadow-lg bg-light text-danger profile_form">
          <div class="input-group mb3 input-group-lg my_inputs">
              <select class="form-select border-transparent bg-light" id="inputGroupSiteOptions" aria-label="Example select with button addon">
                <option selected>Choose site</option>
                <option value="google">google-com</option>
                <option value="agoda">agoda-com</option>
                <option value="booking">booking-com</option>
                <option value="tripadvisor">tripadvisor-com</option>
                <option disabled value="expedia">expedia-com</option>
                <option disabled value="ctrip">ctrip-com</option>
                <option disabled value="hotels">hotels-com</option>
                <option disabled value="trip">trip-com</option>
              </select>
            <button class="btn btn-lg btn-outline-success rounded shadow shadow-sm sub__this_form" type="button" id="proertyName29">Submit</button>
          </div>
    
          <div class="input-group mb3 my_inputs">
            <textarea type="text" name="propertyurl" id="propertUrlInputY" placeholder="Paste your site property review page link here... " rows="10" class="form-control" aria-label="propertyUrl"></textarea>
          </div>
        </form>`

      const container = document.querySelector('#review_main_wrapper')
      container?.insertAdjacentHTML('afterbegin', uploadHTML)

      const submit____btn = document.querySelector('.sub__this_form')
      submit____btn?.addEventListener('click', async () => {
        sendCreateProfileRequest()
      })
      document.addEventListener('keydown', async event => {
        if (event.key === 'Enter') {
          event.preventDefault()
          console.log('submitted')
          sendCreateProfileRequest()
        }
      })
    } else {
      formIsPresent?.remove()
    }
  },
  // ************* =====Create profile === ************* //

  // ************* =====Fetch review site profile === ************* //

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
      tripType = PLUGINS.normalizeTravelType(reviewsDataOject?.tripType),
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
      isExpertReviewer = miscellaneous?.isExpertReviewer

    const InnerReviewHTMLContent = `
      <div id="${_id}" class="row review-container shadow shadow-sm review-incoming __${authorExternalId}  m-auto ${userId}" data-reviewPageId="${reviewPageId}" data-slug="${reviewSiteSlug}">
            <div class="card text-bg-light my-font-color  card-left" data-userId="${userId}" style="width: 22%;margin:0 !important">
                <div class="card-header shadow-none card_header">
                <img src="" style="width:30%;max-width:100px !important;min-width:57px !important;max-height:100px !important;border-radius:3px" class="img-thumbnail review-logo-${uuid}-${internalId} bg-transparent" alt="...">
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
                        (author && author) || '..'
                      }</h4>
                      </a>
                      </a>
                  </div>
                  <h5 class="card-title review-author d-inline m-1 text-left text-muted">
                    ${title ? `<q>${title}</q>` : ''}
                  </h5>
                  <p class="review-body">${
                    (reviewBody && reviewBody) ||
                    'There are no comments available for this review'
                  }</p>

                    <span class="card-text review-submitted-date">
                      <small class="text-muted">Created: ${PLUGINS.formatDate(
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
                          <ul class="dropdown-menu  bg-light">
                            <li><a class="dropdown-item text-dark rounded shadow shadow-sm" href="#">Copy review link</a></li>
                            <li><a class="dropdown-item text-dark rounded shadow shadow-sm" href="#">Contact customer service</a></li>
                            <li><a class="dropdown-item text-dark rounded shadow shadow-sm" href="#">Generate review analysis</a></li>
                          </ul>
                      </div>
                  </div>
                <div class="d-grid gap-2 col-6 mx-auto m-auto action_buttons right__body" style="width:100%;">
                  <a class="btn btn-transparent btn-outline-secondary action_2" href="${
                    originalEndpoint || propertyProfileUrl
                  }" target="_blank"  type="button">Go to ${reviewSiteSlug}</a>
                  <button disabled class="btn btn-transparent btn-outline-secondary shadow shadow-sm action_4" pageid-data="${_id}" authorexternalid="${authorExternalId}"  type="button">Update review</button>
                  <button class="btn btn-transparent btn-outline-danger action_3 shadow shadow-sm" del-revie-data="${_id}"  type="button">Delete review</button>
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
        { key: 'Checkin', value: checkInDate },
        { key: 'Checkout', value: checkOutDate },
        { key: 'Guest stayed', value: `${(stayStatus && 'Yes') || ''}` },
        { key: 'Recommended', value: `${(recommended && 'Yes') || ''}` },
        { key: 'Trip type', value: tripType },
        { key: 'Room type', value: roomTypeName },
        { key: 'Nights stayed', value: lengthOfStay },
        { key: 'Country', value: country },
        { key: 'Professional Reviewer', value: isExpertReviewer }
      ],
      authorExternalId
    )
  },
  fetchData: async function (page = 1, slug = '') {
    try {
      runSpinner(false, 'loading...')

      const user = getAuthHandler()
      if (user) {
        const apiClient = await API_CLIENT()

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
          setTimeout(() => runSpinner(true), 500)
          const data = res.data.data || []

          if (data.length < perPage) {
            displayLabel([
              'review_main_wrapper',
              'alert-success',
              `This is the last page: ${page}`
            ])
            return data
          }
          if (slug === '') {
            displayLabel([
              'review_main_wrapper',
              'alert-success',
              `Page: ${page}`
            ])
          }
          return data
        }
      }
      return displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `An error occurred while processing your request. Please try again later`
      ])
    } catch (error) {
      if (error.response && error.response.status === 400) {
        return displayLabel([
          'review_main_wrapper',
          'alert-warning',
          `Nothing found.`
        ])
      }
      if (error.response && error.response.status === 404) {
        PLUGINS.handleProfileGenerator(null, false)
        return displayLabel([
          'review_main_wrapper',
          'alert-secondary',
          `No review data available. \nCreate a ${slug} profile by submiting a property url in the input above and I'll take care of the rest for you.`
        ])
      }
    } finally {
      runSpinner(true)
    }
  },
  PaginateData: async function (slug) {
    runSpinner(false)
    PLUGINS.removeAdminContainer()
    let page = 1
    const container = document.getElementById('review_main_wrapper')

    if (!container) return
    const user = getAuthHandler()
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
        displayLabel([
          'review_main_wrapper',
          'alert-danger',
          `Sorry, an error occurred while processing your request.`
        ])
        return await LOGIN_HTML()
      }
      console.warn(error)
    } finally {
      runSpinner(true)
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
    <div id="${profile_id}" class="card admin-card bg-light-custom shadow  user-${account_id}" style="min-width:250px; width:30%; max-width: 25rem;">
    <div class="card-header d-flex justify-content-between align-content-center">
        <h4 class="lead text-uppercase">${slug || ''}</h4>
      </div>
      <div class="card-body shadow shadow-lg d-block justify-content-around align-content-center">
          <div class="container d-block">
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
    <div class="card-footer d-flex justify-content-between align-content-center bg-light">
        <div class="btn-group" role="group">
            <button type="button" class="btn btn-outline-success w-50 dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false">
              Actions
            </button>
            <ul class="dropdown-menu bg-light text-dark" style="z-index:1000 !important">
              <li>
                  <a class="dropdown-item text-dark text-decoration-underline" href="#">Run Crawler</a>
                  <div class="container">
                    <div class="form-check text-muted crawl-${profile_id}">
                        <label class="form-check-label" for="gridCheck">full</label>
                        <input class="form-check-input text-dark" data-full="${profile_id}" type="checkbox" id="gridCheck">
                    </div>
                    <div class="form-group d-flex p-2 gap-2 justify-content-between align-content-center">
                        <label for="pagesInput" class="text-dark text-muted">Pages</label>
                        <div class="text-dark">
                            <input type="number" data-page="${profile_id}" style="color:#000000; width:inherit;" class="form-control active bg-light-custom pagesInput  text-dark" id="pagesInput" name="pages" value="1">
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
            <ul class="dropdown-menu bg-light shadow shadow-lg text-dark" style="z-index:1000 !important">
              <li class="">
                <a class="dropdown-item text-danger del_all_reviews" href="#">Delete profile & reviews</a>
                  
              </li>
              <li><a class="dropdown-item text-danger del_entire_account" href="#">Delete account</a></li>
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
              await fetchCurrentUserUpdateSeesionStorage()
              const deletedProfileCard = document.getElementById(`${cardId}`)
              deletedProfileCard.remove()
              runSpinner(true)
            }
          }
        } catch (e) {
          console.log(e.message)
          displayLabel([
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
              displayLabel([
                'review_main_wrapper',
                'alert-secondary',
                `Sad to see you go. If you wish to use our service, you can always signup`
              ])
              setTimeout(async () => {
                await SIGNUP_HTML()
                runSpinner(true)
              }, 3000)
            }
          }
        } catch (e) {
          console.log(e.message)
          displayLabel([
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
      runSpinner(false, 'Deleting...')

      const user = getAuthHandler()
      const { 'auth-token': token } = user

      const baseUrl = `/user/delete-own-profile-and-documents/${profile_Id}?slug=${slug}`
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      const apiClient = await API_CLIENT()
      const response = await apiClient.delete(baseUrl, { headers })
      if (response.status === 200) {
        runSpinner(true)

        displayLabel([
          'review_main_wrapper',
          'alert-success',
          `Profile and all reviews associated with it have been deleted successfully`
        ])
        await fetchCurrentUserUpdateSeesionStorage()
        return true
      } else {
        displayLabel([
          'review_main_wrapper',
          'alert-danger',
          `Something went wrong! Profile could not be deleted. `
        ])
        return false
      }
    } catch (e) {
      console.log(e)
      displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `Something went wrong! Profile could not be deleted. `
      ])
    } finally {
      runSpinner(true)
    }
  },
  deletEntireAccount: async function () {
    try {
      runSpinner(false, 'Deleting...')

      const user = getAuthHandler()
      const { 'auth-token': token } = user

      const baseUrl = '/user/purge-own-user-account'
      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      const apiClient = await API_CLIENT()
      const response = await apiClient.delete(baseUrl, { headers })
      if (response.status === 200) {
        runSpinner(true)

        displayLabel([
          'review_main_wrapper',
          'alert-success',
          `Your account has been deleted.`
        ])
        PLUGINS.clearStorage('sessionStorage')
        PLUGINS.clearStorage('localStorage')
        return true
      } else {
        displayLabel([
          'review_main_wrapper',
          'alert-danger',
          `Something went wrong! Profile could not be deleted. `
        ])
        return false
      }
    } catch (e) {
      console.log(e)
      displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `Something went wrong! account could not be deleted.`
      ])
    } finally {
      runSpinner(true)
    }
  },
  createAdminPage: async function () {
    const pageAlreadyExists = document.querySelector('#admin_page')
    if (pageAlreadyExists)
      return displayLabel([
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
    await fetchCurrentUserUpdateSeesionStorage()
    const { profiles, ...rest } = await getAuthHandler()

    if (!profiles.length)
      return displayLabel([
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
      const userLocalStorage = await getAuthHandler()
      const userDB = await fetchCurrentUserUpdateSeesionStorage()

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
          <div class="modal-content bg-transparent text-dark border-4 shadow shadow-lg" style="backdrop-filter:blur(30px);border-radius:.8rem;max-height:95%;overflow-y:auto;">
                <div class="card shadow shadow-lg custome-color2 h-100 w-100">
                  <div class="card-body  border-transparent">
                    <h3 class="card-title text-decoration-underline">${propertyName}</h3>
                    <p class="card-text">Email: ${email}</p>
                    <p class="card-text">Admin: ${
                      (isAdmin && 'Yes') || 'No'
                    }</p>
                    <p class="card-text">Subscription:  ${
                      (isSubscribed && 'Active') || 'Inactive'
                    }</p>
                    <div class="row profile__container gap-3"></div>
                  </div>
                  <div class="container d-flex justify-content-around align-content-center gap-2">
                    <button type="button" class="btn  btn-outline-secondary m-auto border-1 btn-lg mt-1 shadow shadow-lg rounded mb-3 w-50" data-bs-dismiss="modal">Exit</button>
                    <button type="button" class="btn  btn-outline-danger m-auto border-1 btn-lg mt-1 shadow shadow-lg rounded mb-3 w-50 del_account__btn">Delete account</button>
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
          runSpinner(false, 'Fetching...')
          setTimeout(() => {
            modal.show()
            runSpinner(true)
            runSpinner(false, 'Finishing...')
            setTimeout(() => {
              runSpinner(true)
              displayLabel([
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
              return displayLabel([
                'review_main_wrapper',
                'alert-danger',
                `You dont have any profiles sofur!`
              ])
            const {
              _id: profileId,
              name: profileName,
              originalUrl,
              propertyType,
              slug
            } = object
            const card = document.createElement('div')
            card.classList.add('w-100')

            const cardBody = document.createElement('div')
            cardBody.classList.add(
              'card',
              'bg-light-custom',
              'shadow',
              'shadow-sm',
              'rounded'
            )

            const cardContent = `
              <div class="card-body bg-light-custom2">
                  <h5 class="card-title">${profileName}</h5>
                  <p>ID: ${profileId} </p>
                  <p>Review site: (${slug}) </p>
                  <p>Property type: ${propertyType} </p>
                  <p class="card-text">${
                    object.description || 'No description available.'
                  }</p>
                  <a href="${
                    originalUrl || '#'
                  }" class="btn btn-secondary" target="_blunk">Visit review Site</a>
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
                  displayLabel([
                    'review_main_wrapper',
                    'alert-secondary',
                    `Sad to see you go. If you wish to use our service, you can always signup`
                  ])
                  setTimeout(async () => {
                    await SIGNUP_HTML()
                    runSpinner(true)
                  }, 3000)
                }
              }
            })
        })
      }

      displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `You dont see to have any profiles currently. `
      ])
    } catch (e) {
      console.log(e)
    }
  }
}
