import { LOGIN_HTML } from '../components/login.js'
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
            LOGIN_HTML()
          }
        }
        return Promise.reject(error)
      }
    )
    return apiClient
  },
  previousTextContent: null,
  simpleLoader: async function (anchor, isLoading) {
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
        const stars = '&bigstar;'.repeat(parseInt(value, 10))

        const spanElement = document.createElement('span')
        spanElement.classList.add('text-warning')

        const smallElement = document.createElement('small')
        smallElement.classList.add('text-light')
        smallElement.textContent = `${key}: `

        const starsElement = document.createElement('span')
        starsElement.innerHTML = stars

        spanElement.appendChild(smallElement)
        spanElement.appendChild(starsElement)

        cardBody?.appendChild(spanElement)
      })
    }
  },
  runSpinner: async function (isDone, message = 'loading') {
    const loader = document.querySelector('#main-page-loader')
    if (!isDone) {
      if (!loader) {
        const loaderHTML = `
            <div id="main-page-loader" class="d-flex align-items-center text-white justify-content-center"
              style="position:fixed; top:0; left:0; right:0; bottom:0;z-index:3000">
              <div class="d-flex">
                <p class="fs-4" id="my_text" style="position:absolute;top:50%;opacity:.7;left:50%;transform:translate(-50%, -50%);">
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
          accordionElement.className = 'accordion accordion-flush bg-dark'
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
          accordionBody.className = 'accordion-collapse collapse'
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
      console.error('Error in addReviewResponse:', error.message)
    }
  },
  createRating: async function (ratingValue, selector) {
    const smallElement = document.querySelector(selector)
    if (smallElement) {
      const stars = '&bigstar;'.repeat(parseInt(ratingValue, 10))

      const containerElement = document.createElement('span')
      const textElement = document.createElement('span')
      textElement.textContent = 'Rating: '

      const starsElement = document.createElement('span')
      starsElement.innerHTML = stars

      starsElement.classList.add('text-success')

      containerElement.appendChild(textElement)
      containerElement.appendChild(starsElement)

      smallElement.innerHTML = ''
      smallElement.appendChild(containerElement)
    }
  },
  addAdminLinkToNavbar: async function () {
    const navUl = document.getElementById('__nav')
    const userString = await PLUGINS.getAuthHandler()

    if (userString) {
      const { superUserToken, isSuperUser, isSubscribed } = userString
      if (superUserToken && isSuperUser && isSubscribed) {
        const adminLi = document.createElement('li')
        adminLi.classList.add('nav-item', 'dropdown')

        const adminLink = document.createElement('a')
        adminLink.classList.add(
          'dropdown-item',
          'dropdown-item-dark',
          'text-white',
          'bg-transparent',
          'mwesigwa_link'
        )
        adminLink.href = '#'
        adminLink.textContent = 'Admin'
        adminLi.appendChild(adminLink)
        navUl?.insertBefore(adminLi, navUl.firstChild)
      }
    }
  },
  reviewCount: async function (countTotal, selector) {
    const container = document.querySelector(selector)

    if (container && countTotal) {
      const spanElement = document.createElement('span')
      spanElement.classList.add('text-muted')

      spanElement.innerHTML = `Review count: <span style="color: green;font-weight:700">${countTotal}</span>`
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
    if (userObject && headers) {
      const { version, createdAt, updatedAt, ...userWithoutMeta } = userObject

      const auth_token = headers.authorization.split(' ')[1]
      userWithoutMeta['auth-token'] = auth_token

      sessionStorage.setItem('user', JSON.stringify(userWithoutMeta))

      return userWithoutMeta
    }
    return null
  },
  getAuthHandler: function () {
    const userString = sessionStorage.getItem('user')
    const user = userString ? JSON.parse(userString) : null
    return user
  },
  loginUser: async function (user) {
    if (!user) return
    const cookieRef = await PLUGINS.handleCookieAcceptance()
    if (!cookieRef) return
    runSpinner(false, 'On it')
    const email = user.email
    const password = user.password

    try {
      let url = '/user/login'
      const response = await API_CLIENT.post(url, { email, password })
      if (response.status == 200) {
        await displayLabel([
          'review_main_wrapper',
          'alert-success',
          'Login successful...'
        ])
        runSpinner(true)
        const userCreds = await setAuthHandler(user, headers)
        const { isAdmin } = userCreds

        if (isAdmin) {
          sessionStorage.setItem('redirected', true)
          Notify(`Login successful`)
          setTimeout(async () => {
            runSpinner(true)
            PLUGINS.userGuideModel()
            return await MAIN_PAGE()
          }, 800)
        }
      }
    } catch (error) {
      console.log(passwordsuggest)
      runSpinner(false, 'Failed!')
      const errorMessage = error.response.data.error || 'An error occurred.'
      displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `Session error: ${errorMessage}`
      ])
      setTimeout(() => runSpinner(true), 800)
      console.log(error)
    } finally {
      runSpinner(true)
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
  removeElementFromDOM: function (elementAnchor) {
    if (document.contains(elementAnchor)) {
      elementAnchor.remove()
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
  Notify: async function (message = '...') {
    const existingNotification = document.getElementById('notifications')
    if (existingNotification) {
      existingNotification.remove()
    }

    const notification = document.createElement('div')
    notification.id = 'notifications'
    notification.className =
      'alert alert-transparent p-1 rounded showNotification'
    notification.setAttribute('role', 'alert')
    notification.style.cssText =
      'min-width:fit-content;font-size:0.7rem;font-style:italic;'

    const messageElement = document.createElement('p')

    messageElement.style.color = 'white'
    messageElement.innerText = message || ''
    notification.appendChild(messageElement && messageElement)

    document.body.appendChild(notification)
    setTimeout(() => {
      notification.classList.remove('showNotification')
      setTimeout(() => {
        notification.remove()
      }, 500)
    }, 5000)
  },
  displayLabel: async function ([anchorId, labelClass, labelText]) {
    const existingAlert = document.querySelector('.main___alert')
    if (existingAlert) {
      existingAlert.remove()
    }
    const label = document.createElement('div')
    label.classList.add('alert', labelClass, 'text-center', 'main___alert')
    label.textContent = labelText

    const anchor = document.getElementById(anchorId)
    if (anchor) {
      anchor.appendChild(label)

      setTimeout(() => {
        if (anchor.contains(label)) {
          anchor.removeChild(label)
        }
      }, 5000)
    } else {
      console.log(`Anchor with ID '${anchorId}' could not be found`)
    }
  },
  notifyAndDisplayLabel: function (alertClass, message) {
    PLUGINS.Notify(message)
    PLUGINS.displayLabel(['review_main_wrapper', alertClass, message])
  },
  confirmAction: async function (containerId, message) {
    if (message === undefined || null)
      message = `This action cannot be reversed. Are you sure you want to proceed ? `
    return new Promise(resolve => {
      const modalHTML = `
        <div class="modal fade" style="backdrop-filter: blur(7px) !important;" id="exampleModalToggle" aria-hidden="true" aria-labelledby="exampleModalToggleLabel" tabindex="-1">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content bg-dark text-light">
              <div class="modal-header">
                <h1 class="modal-title fs-5 text-danger" id="exampleModalToggleLabel">Danger zone</h1>
                <button type="button" class="btn-close btn-primary" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body text-muted">${message}</div>
              <div class="modal-footer">
                <button type="button" class="btn-lg bg-transparent btn-outline-danger proceed_delete" data-bs-dismiss="modal">Proceed</button>
                <button type="button" class="btn-lg bg-transparent btn-outline-success cancel_delete" data-bs-dismiss="modal">Cancel</button>
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
        PLUGINS.Notify('Process aborted.')
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
            <div class="modal fade text-dark" id="cookieModal" data-bs-backdrop="static" data-bs-keyboard="false" tabindex="-1" aria-labelledby="cookieModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
              <div class="modal-content bg-dark">
                <div class="modal-header">
                  <h1 class="modal-title fs-5 text-light" id="cookieModalLabel">Cookie Policy</h1>
                  <button type="button" class="btn-close text-light c--iie-c-btn" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                  <p class="text-light">This website uses cookies to enhance the user experience. By accepting cookies, you agree to our <a href="#" class="text-primary">Terms of Service</a> and <a href="#" class="text-primary">Privacy Policy</a>.</p>
                </div>
                <div class="modal-footer">
                  <button type="button" class="btn btn-lg btn-outline-secondary" id="rejectCookies" data-bs-dismiss="modal">Reject</button>
                  <button type="button" class="btn btn-lg btn-outline-primary" id="acceptCookies">Accept</button>
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
        console.error(
          'An error occurred from handleAsyncErrors:',
          error.message
        )
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
      console.error('Error fetching from localStorage:', error)
      return null
    }
  },
  saveToLocalStorage: async function (key, data) {
    try {
      const serializedData = JSON.stringify(data)
      localStorage.setItem(key, serializedData)
    } catch (error) {
      console.error('Error saving to localStorage:', error)
    }
  },
  userGuideModel: async function () {
    const userGuideServiceModal = `
        <button type="button" class="btn btn-sm modaal_cont position-absolute"  data-bs-toggle="modal" data-bs-target="#exampleModal">
        </button>
        <div class="modal fade" id="exampleModal" tabindex="-1" aria-labelledby="exampleModalLabel" aria-hidden="true">
          <div class="modal-dialog modal-dialog-scrollable">
            <div class="modal-content bg-transparent text-light" style="backdrop-filter:blur(20px);border:2px solid #13283b80;">
              <div class="modal-header text-white" style="background: #13283b80;">
                <h5 class="modal-title" id="exampleModalLabel">How it works</h5>
                <button type="button" class="btn-close text-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body text-light" style="background-color: #13283b80;">
                <ul style="opacity:0.5;">
                  <li>Sign up: Start by creating an account with your email address and password. This will grant you access to this application.</li>
                  <li>Once account is created, you'll be logged in automatically. Once you're logged in, you can easily upload your documents. Simply click on the 'Upload' button and select the file you wish to upload. This application supports various file formats, including 'PDF', 'jpeg', 'jpg', 'png', 'gif', 'pdf', 'webp' and 'avif'. Please note, for demo accounts, a maximum of 5 files can be uploaded at a time. </li>
                 <li>Manage Documents: After uploading your documents, you can manage them efficiently. You can view a list of all your uploaded documents, search for specific documents, see all document count in your account delete your account or delete entire document catalogue.</li>
                  <li>Document Security: We prioritize the security and privacy of your documents. All documents are stored securely using encryption techniques, and access to your documents is protected with user authentication and authorization. Only you can see, modify, and or delete your documents. </li>
                 <li>Mobile Accessibility: Access your documents on the go! Our application is fully responsive and accessible on mobile devices, allowing you to manage your documents from anywhere, anytime.</li>
                  </ul>
              </div>
              <div class="modal-footer" style="border:2px solid #13283b80;background-color: #13283b80;">
                <button type="button" class="btn text-success  bg-transparent btn-lg" style="border: 2px solid #13283b80;" data-bs-dismiss="modal">Close Modal</button>
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
      }, 2000)
      PLUGINS.saveToLocalStorage('userGuideShown', true)
    }
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

      PLUGINS.runSpinner(false)

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
      console.error('Error deleting document:', error.message)
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
  updateReview: async function (documentId, authorExternalId) {
    try {
      if (!documentId || !authorExternalId) {
        throw new Error('Invalid payload')
      }

      PLUGINS.runSpinner(false)
      const headers = PLUGINS.getHeaders()

      if (headers) {
        const baseUrl = '/update-review'

        const apiClient = await PLUGINS.API_CLIENT()
        const response = await apiClient.post(
          baseUrl,
          { reviewId: documentId, authorExternalId },
          { headers }
        )
        console.log(response)

        if (response.status == 200) {
          console.log(response.data)

          PLUGINS.displayLabel([
            'review_main_wrapper',
            'alert-success',
            `Review updated successfully`
          ])
          PLUGINS.runSpinner(true)
          return true
        }
      }
      throw new Error(`Failed to update review: ${response.data}`)
    } catch (error) {
      console.error('Error deleting document:', error.message)
      PLUGINS.displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `An error occurred: ${error.message}`
      ])
    } finally {
      PLUGINS.runSpinner(true)
    }
  },
  handleReviewButtonsEvents: async function () {
    const reviewContainer = document.getElementById('review_main_wrapper')
    if (!reviewContainer) {
      console.error('Review container not found')
      return
    }
    reviewContainer.addEventListener('click', async event => {
      const clickedButton = event.target.closest('button')
      if (clickedButton) {
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
              console.error('Error handling button click:', error.message)
            }
          }
          return
        }
        // ************
        // ************
        if (clickedButton.classList.contains('action_4')) {
          const reviewId = PLUGINS.getOutermostReviewId(clickedButton)
          const authorExternalId = PLUGINS.getAuthorExternalIdId(clickedButton)

          if (reviewId) {
            try {
              PLUGINS.simpleLoader(`[pageid-data="${reviewId}"]`, true)

              setTimeout(async () => {
                const updatedReview = await PLUGINS.updateReview(
                  reviewId,
                  authorExternalId
                )

                if (updatedReview) {
                  const deletedCard = document.getElementById(`${reviewId}`)
                  deletedCard?.classList.add('delete_item')
                  setTimeout(() => deletedCard.remove(), 100)
                  await PLUGINS.generateReviewCard(updatedReview)
                  location.reload(true)
                }
              }, 1500)
            } catch (error) {
              PLUGINS.simpleLoader(`[del-review-data="${reviewId}"]`, false)
              console.error('Error handling button click:', error.message)
            }
          }
          return
        }
        // ************
      }
    })
  },
  getOutermostReviewId: function (buttonElement) {
    const reviewContainer = buttonElement.closest('.review-container')
    if (reviewContainer) {
      return reviewContainer.id
    }
    return null
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
  generateReviewCard: async function (reviewsDataOject = {}) {
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
      <div id="${_id}" class="row review-container review-incoming  bg-dark m-auto ${userId}" data-reviewPageId="${reviewPageId}">
            <div class="card text-bg-dark dark-gray-bg my-font-color  card-left" data-userId="${userId}" style="width: 22%;margin:0 !important">
                <div class="card-header shadow-none border-0">
                <img src="" style="width:30%;max-width:75px !important;min-width:57px !important" class="img-thumbnail review-logo-${uuid} bg-transparent" alt="...">
                </div>
                <div class="card-body d-flex flex-column left__body" data-subratings="${authorExternalId}">
                    <span class="text">Posted: ${
                      (reviewDate && reviewDate) || '0000-00-00'
                    } </span>
                    <span class="text">Trip type: <a href="#">${
                      (tripType && tripType) || 'Leisure'
                    }</a></span>
                    <br>
                    <span class="text" data-guest-rating="rating-${authorExternalId}"></span>
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
                <h5 class="card-title text-light text-center">Actions</h5>
                </div>
                <div class="d-grid gap-2 col-6 mx-auto m-auto action_buttons right__body" style="width:100%;">
                  <button class="btn btn-transparent btn-outline-secondary action_1 hide text-white has-response-${uuid}"  type="button">Respond to review</button>
                  <a class="btn btn-transparent btn-outline-secondary action_2 text-white" href="${originalEndpoint}" target="_blank"  type="button">See review on google</a>
                  <button class="btn btn-transparent btn-outline-danger action_3 text-white" del-revie-data="${_id}"  type="button">Delete review</button>
                  <button class="btn btn-transparent btn-outline-secondary action_4 text-white" pageid-data="${_id}" authorexternalid="${authorExternalId}"  type="button">Update review</button>
                </div>
          </div>
      </div>`

    const parent_wrapper = document.querySelector('#review_main_wrapper')
    parent_wrapper?.insertAdjacentHTML('beforeend', InnerReviewHTMLContent)

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
    PLUGINS.getSiteLogoPath(reviewSiteSlug, `.review-logo-${uuid}`)
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
              `Reviews on page: ${page}`
            ])
          } else {
            PLUGINS.displayLabel([
              'review_main_wrapper',
              'alert-success',
              `Reviews for only ${slug}, page: ${page}`
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
        return PLUGINS.displayLabel([
          'review_main_wrapper',
          'alert-warning',
          `Nothing found for this account!`
        ])
      }
    } finally {
      PLUGINS.runSpinner(true)
    }
  },
  PaginateData: async function (slug) {
    PLUGINS.runSpinner(false)
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
                    PLUGINS.Notify(`Last page: ${page}`)
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
  handlePaginatedDataClick: async function (event) {
    try {
      const newTextContent = event.target.textContent
      if (newTextContent === PLUGINS.previousTextContent) return
      PLUGINS.previousTextContent = newTextContent
      try {
        const reviews = document.querySelectorAll('.review-container')
        if (reviews.length) {
          reviews.forEach(reviewContainer => reviewContainer.remove())
          await PLUGINS.PaginateData(newTextContent)
          return
        }
        await PLUGINS.PaginateData(newTextContent)
      } catch (e) {
        console.log(e.message)
      }
    } catch (e) {
      console.log(e.message)
    }
  },
  handlePaginatedDataAllAccounts: async function () {
    const dropdownMenu = document.querySelector('._inner_dropdown_canvas')
    const links = dropdownMenu?.querySelectorAll('a')
    links?.forEach(link => {
      link.addEventListener('click', PLUGINS.handlePaginatedDataClick)
    })
  },
  roadRunners: async function () {
    await PLUGINS.PaginateData()
  }
}
