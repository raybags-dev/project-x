import {
  runSpinner,
  validateSlug,
  justForAMoment,
  shakeAnimation,
  clearProfileForm,
  removeElementFromDOM
} from '../utils/utilities.js'
import {
  setAuthHandler,
  getAuthHandler,
  fetchCurrentUserUpdateSeesionStorage
} from './auth.js'
import { SIGNUP_HTML } from './signup.js'

export async function API_CLIENT () {
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
          displayLabel([
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
}
export async function loginUser (user) {
  if (!user || !user.email || !user.password) {
    displayLabel([
      'review_main_wrapper',
      'alert-danger',
      'Invalid credentials.'
    ])
    console.error('Invalid user or credentials')
    return null
  }
  const url = '/user/login'
  try {
    const apiClient = await API_CLIENT()
    const loginResponse = await apiClient.post(url, {
      email: user.email,
      password: user.password
    })
    const { user: userData } = loginResponse.data
    const { headers, status } = loginResponse

    if (status === 200) {
      await setAuthHandler(userData, headers)
      sessionStorage.setItem('redirected', true)
      displayLabel([
        'review_main_wrapper',
        'alert-success',
        'Login successful.'
      ])
      return loginResponse
    }
    console.log('Error in login!', loginResponse && loginResponse)
    return displayLabel([
      'review_main_wrapper',
      'alert-danger',
      'Login failed!'
    ])
  } catch (error) {
    runSpinner(false, 'Failed!')

    const isNotUser = error.response?.statusText.includes('Unauthorized')
    const isUnauthorized = error.response.status === 401 && isNotUser

    if (isUnauthorized) {
      displayLabel([
        'review_main_wrapper',
        'alert-danger',
        'Your account could not be found!. PLease register to use this service.'
      ])
      setTimeout(async () => {
        return await SIGNUP_HTML()
      }, 3000)
    }
    displayLabel([
      'review_main_wrapper',
      'alert-danger',
      'Login failed. PLease try to login again!'
    ])
    return error?.response
  }
}
export async function displayLabel ([anchorId, labelClass, labelText]) {
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
}
export async function sendCreateProfileRequest () {
  let slug = ''
  const user = getAuthHandler()
  if (!user) return
  const { 'auth-token': token, isAdmin, _id } = user

  try {
    const formData = new FormData()

    if (!isAdmin || !token) {
      displayLabel(['main__wrapper', 'alert-danger', 'Unauthorized!'])
      return
    }

    if (token && isAdmin) {
      const apiClient = await API_CLIENT()

      const defaultValue = 'Choose site'
      const siteOptions = document.getElementById('inputGroupSiteOptions')
      const selectedOption = siteOptions.querySelector('option:checked')

      if (selectedOption.value === defaultValue) {
        displayLabel([
          'review_main_wrapper',
          'alert-warning',
          'Please select a review-site name to create a profile!'
        ])
        return
      }

      const siteUrl = document.querySelector('#propertUrlInputY').value.trim()

      if (!siteUrl.length) {
        displayLabel([
          'review_main_wrapper',
          'alert-warning',
          'Property URL is missing. URL is required for this operation!'
        ])
        return
      }

      // Validate URL format
      const urlRegex = /^(https?:\/\/(www\.)?|www\.)\S*$/
      if (!urlRegex.test(siteUrl)) {
        displayLabel([
          'review_main_wrapper',
          'alert-danger',
          'Invalid URL format. Please provide a valid URL starting!'
        ])
        return
      }

      runSpinner(false, 'Creating...')

      formData.append('frontFacingUrl', siteUrl)
      slug = selectedOption ? selectedOption.value : ''
      const urlPart = slug ? `create-${slug}-review-profile` : ''
      const baseUrl = `/user/${urlPart}`
      console.log('debugger ')

      const isValidRequest = validateSlug(slug, siteUrl)

      if (!isValidRequest) {
        shakeAnimation('#uploadForm')
        return clearProfileForm()
      }

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      const res = await apiClient.post(baseUrl, formData, { headers })
      runSpinner(true)

      if (res.status === 200) {
        removeElementFromDOM('#uploadForm')
        displayLabel([
          'review_main_wrapper',
          'alert-success',
          `Account profile for ${slug} has been created successfully`
        ])
        setTimeout(() => {
          runSpinner(false)
          displayLabel([
            'review_main_wrapper',
            'alert-success',
            `Collecting reviews for ${slug} in progress...`
          ])
        }, 2000)
        const response = await fetchReviewSiteProfile(_id, slug)

        if (response.status === 200) {
          //update localsession
          await fetchCurrentUserUpdateSeesionStorage()
          const data = await response.data
          if (data.length) {
            await runCrawlerHandler(slug)
          }
        }
      } else {
        setTimeout(() => {
          runSpinner(true, 'Failed!')
          displayLabel([
            'review_main_wrapper',
            'alert-warn',
            `Request could not be fulfilled! Please try again later.`
          ])
        }, 2000)
      }
    }
  } catch (error) {
    if (error.response && error.response.status === 400) {
      removeElementFromDOM('#uploadForm')
      runSpinner(true)
      displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `This account already has a ${slug} profile!`
      ])
      runSpinner('Running...')
      await runCrawlerHandler(slug)
      runSpinner(true)
    }
  }
}
export async function fetchReviewSiteProfile (user_id, slug) {
  runSpinner(false)
  if (!user_id) {
    runSpinner(true)
    return displayLabel([
      'review_main_wrapper',
      'alert-danger',
      `Invalid request!`
    ])
  }

  try {
    runSpinner(false, 'Processing...')
    const user = getAuthHandler()
    const { 'auth-token': token } = user

    const baseUrl = `/user/get-profile/${user_id}?slug=${slug}-com`
    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }

    const apiClient = await API_CLIENT()
    const response = await apiClient.post(baseUrl, {}, { headers })

    if (response.status === 200) {
      runSpinner(true)
      const profile = await response
      return profile
    }
    return null
  } catch (e) {
    console.log(e.message)
    displayLabel([
      'review_main_wrapper',
      'alert-danger',
      `Error collecting profile ${e.message} `
    ])
  }
}
export async function runCrawlerHandler (slug, depth = 20) {
  if (!slug) return
  runSpinner(false, 'Crawling...')

  try {
    const user = getAuthHandler()
    console.log(user)
    if (user) {
      const apiClient = await API_CLIENT()

      const baseUrl = `/user/generate-${slug}-reviews`
      const query = `?depth=${depth}`

      const { 'auth-token': token } = user

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
      console.log(headers)

      const url = `${baseUrl}${query}`
      const res = await apiClient.post(url, {}, { headers })
      console.log('>>>>>>>>>', url)

      removeElementFromDOM('#uploadForm')

      if (res.status === 200) {
        displayLabel([
          'review_main_wrapper',
          'alert-success',
          `Review data has been collected successfully!`
        ])
        setTimeout(() => location.reload(), 2000)
      } else if (res.status === 404) {
        runSpinner(true, 'Failed!')
        displayLabel([
          'review_main_wrapper',
          'alert-warning',
          `Someting went wrong: ${slug} review collection process failed!`
        ])
      } else {
        displayLabel([
          'review_main_wrapper',
          'alert-warning',
          `Someting went wrong: Review data could not be collected!`
        ])
      }
    }
  } catch (e) {
    if (
      e &&
      e.response &&
      e.response.error &&
      e.response.error.status === 503
    ) {
      displayLabel([
        'review_main_wrapper',
        'alert-danger',
        `Service unavailable, please try again later ${e.message}`
      ])
      runSpinner(true)
      return
    }
  }
}
