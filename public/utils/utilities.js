import { displayLabel, API_CLIENT } from '../components/apiCallHandlers.js'
import { getAuthHandler } from '../components/auth.js'

export async function runSpinner (isDone, message = '') {
  const loader = document.querySelector('#main-page-loader')
  if (!isDone) {
    if (!loader) {
      const loaderHTML = `
            <div id="main-page-loader" class="d-flex align-items-center text-dark justify-content-center"
              style="position:fixed; top:0; left:0; right:0; bottom:0;z-index:3000">
              <div class="d-flex">
                <p class="fs-4" id="my_text" style="position:absolute;top:50%;opacity:.8;left:50%;transform:translate(-50%, -50%);">
                  ${message}
                </p>
                <span class="loader text-dark" style="position:absolute;top:50%;left:50%;transform:translate(-50%, -50%);zindex:1000;"></span>
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
}
export async function confirmAction (containerId, message) {
  if (message === undefined || null)
    message = `This action cannot be reversed. Are you sure you want to proceed?`
  return new Promise(resolve => {
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
      <a class="btn btn-transparent" id="modalToggleButton" data-bs-toggle="modal" href="#exampleModalToggle" role="button" style="display:none;"></a>`

    const container = document.querySelector(containerId)
    container?.insertAdjacentHTML('beforeend', modalHTML)

    const modalElement = document.getElementById('exampleModalToggle')
    const modal = new bootstrap.Modal(modalElement)

    const confirmBtn = document.querySelector('.proceed_delete')
    const abortBtn = document.querySelector('.cancel_delete')

    confirmBtn?.addEventListener('click', async () => {
      modal.hide()
      setTimeout(() => {
        modalElement.remove()
        resolve('confirmed!')
      }, 300)
    })

    abortBtn?.addEventListener('click', async () => {
      modal.hide()
      setTimeout(() => {
        modalElement.remove()
        displayLabel([
          'review_main_wrapper',
          'alert-secondary',
          `This process has been aborted.`
        ])
        resolve('Aborted.')
      }, 300)
    })

    modal.show()

    setTimeout(() => {
      abortBtn?.focus()
    }, 150)
  })
}
export function validateSlug (slug, url) {
  let httpOccurrences = (url.match(/http:\/\//g) || []).length
  let httpsOccurrences = (url.match(/https:\/\//g) || []).length

  if (httpOccurrences + httpsOccurrences > 1) {
    const errorMessage =
      'Invalid characters detected in the provided URL. Use a valid URL!'
    displayLabel(['review_main_wrapper', 'alert-danger', errorMessage])
    justForAMoment('Aborting...')
    return false
  }

  const normalizedSlug = slug.trim().replace('-', '.')

  const urlHostMatch = url.match(/https?:\/\/(?:www\.)?([^\/.]+)\./)
  if (!urlHostMatch) {
    displayLabel(['review_main_wrapper', 'alert-danger', 'Invalid URL format!'])
    justForAMoment('Aborting...')
    return false
  }

  const extractedHost = urlHostMatch[1].trim()

  if (extractedHost === normalizedSlug.split('.')[0]) {
    return true
  }

  const errorMessage = `URL does not match the selected site name (${slug}).`
  displayLabel(['review_main_wrapper', 'alert-danger', errorMessage])
  justForAMoment('Aborting...')
  return false
}
export function justForAMoment (message = 'Loading') {
  runSpinner(false, message)
  setTimeout(() => runSpinner(true), 2000)
}
export function shakeAnimation (selector) {
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
}
export function clearProfileForm () {
  const selectDropdown = document.getElementById('inputGroupSiteOptions')
  const textareaInput = document.getElementById('propertUrlInputY')
  if (selectDropdown && textareaInput) {
    selectDropdown.selectedIndex = 0
    textareaInput.value = ''
  }
  return
}
export async function removeElementFromDOM (elementAnchor) {
  try {
    const element = document.querySelector(elementAnchor)
    if (element) {
      element.remove()
    }
  } catch (e) {
    console.log(e.message)
  }
}
export async function finishSetup () {
  try {
    const userString = sessionStorage.getItem('user')
    const user = userString ? JSON.parse(userString) : null

    let propertyName = user?.name?.replace(/_/g, ' ') || ''
    propertyName = propertyName.split('@')[0]
    const headingElement = document.querySelector('.subb_head_ing a')

    if (headingElement) headingElement.textContent = propertyName
  } catch (error) {
    console.error('Error in finishSetup:', error)
  }
}
export function clearContainer (anchorTagOrElement) {
  try {
    const parentElement =
      typeof anchorTagOrElement === 'string'
        ? document.querySelector(anchorTagOrElement)
        : anchorTagOrElement

    if (!parentElement) return false

    const reviewContainers = parentElement.querySelectorAll('.review-container')
    if (!reviewContainers.length) return false

    reviewContainers.forEach(container => container.remove())

    return true
  } catch (error) {
    console.error(`Error clearing review containers: ${error.message}`)
    return false
  }
}
export function mountAdminPageHandler (parentSelector, data) {
  const parentElement = document.querySelector(parentSelector)
  const is_ready = clearContainer(parentElement)

  if (!parentElement) return

  let container = parentElement.querySelector('.admin_page_outer')
  if (!container) {
    container = document.createElement('div')
    container.className =
      'admin_page_outer d-flex flex-wrap justify-content-center gap-2'
    parentElement.appendChild(container)
  }

  if (!data.length) return false
  container.innerHTML = ''
  data.forEach(item => {
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
      profiles: review_profiles
    } = item
    let name = item?.name

    const sanitizeName = name =>
      name?.replace(/_/g, ' ').replace(/@.*/, '').toUpperCase()
    name = sanitizeName(name)

    const card = document.createElement('div')
    card.className = `card m-1 shadow-lg rounded user_accountcard _${id}_`
    card.style =
      'max-width: 15rem; min-width: 30%; min-height: 30vh; max-height: auto;'

    card.innerHTML = `
              <h5 class="card-header bg-transparent text-center">${name}</h5>
              <div class="card-body text-dark" style="overflow-y: auto;">
                  <ul class="list-group">
                      <li class="list-group-item" data-sub="${id}">Subscription Active: ${isSubscribed}</li>
                      <li class="list-group-item">Account Email: ${email}</li>
                      <li class="list-group-item" data-admin="${isAdmin}">Is Admin: ${isAdmin}</li>
                      <li class="list-group-item">Is Superuser: ${isSuperUser}</li>
                      <li class="list-group-item">Has Reviews Profiles: ${hasReviewProfile}</li>
                      <li class="list-group-item" data-uid="${userId}">User ID: ${userId}</li>
                      <li class="list-group-item">Account ID: ${id}</li>
                      <li class="list-group-item">Storage space: ${data_size}</li>
                      <li class="list-group-item">Review Profile Count: ${
                        (review_profiles?.length && review_profiles.length) ||
                        '__'
                      }</li>
                      <li class="list-group-item">Created At: ${createdAt}</li>
                  </ul>
              </div>
              <div class="container bg-transparent d-flex flex-column gap-2 pb-2">
                  <button type="button" class="btn ${
                    isSubscribed ? 'btn-success' : 'btn-secondary'
                  } shadow w-100 subscription-btn" data-user-id="${id}">${
      isSubscribed ? 'Deactivate subscription' : 'Activate subscription'
    }</button>
                  <button type="button" class="btn btn-danger border-danger shadow w-100 delete-btn" data-user-id="${id}">Delete account</button>
              </div>`

    container.appendChild(card)
  })
  const subscriptionButtons = container.querySelectorAll('.subscription-btn')

  subscriptionButtons.forEach(button => {
    button.addEventListener('click', function (e) {
      const userId = e.target.getAttribute('data-user-id')
      const isCurrentlyActive =
        e.target.textContent === 'Deactivate subscription'

      toggleUserSubscription(userId, isCurrentlyActive, e.target)
    })
  })

  const deleteButtons = container.querySelectorAll('.delete-btn')
  deleteButtons.forEach(button => {
    button.addEventListener('click', function (e) {
      const userId = this.getAttribute('data-user-id')
      deleteUserAccount(userId, e)
    })
  })
}

async function toggleUserSubscription (
  userId,
  isCurrentlyActive,
  buttonElement
) {
  try {
    runSpinner(false, 'Processing...')

    const user = getAuthHandler()
    const { 'auth-token': token } = user

    const apiClient = await API_CLIENT()
    const url = `/user/update-subscription/${userId}`

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }

    const response = await apiClient.put(url, {}, { headers })

    if (response.status === 200) {
      runSpinner(true)

      const parentCard = document.querySelector(`._${userId}_`)
      if (!parentCard) {
        console.error(`Parent card for user ${userId} not found.`)
        return
      }

      const newSubState = response.data.isSubscribed

      buttonElement.textContent = newSubState
        ? 'Deactivate Subscription'
        : 'Activate Subscription'
      buttonElement.classList.remove('btn-success', 'btn-secondary')
      buttonElement.classList.add(newSubState ? 'btn-success' : 'btn-secondary')

      const subscriptionStatusElement = parentCard.querySelector(
        `[data-sub="${userId}"]`
      )
      if (subscriptionStatusElement) {
        subscriptionStatusElement.textContent = `Subscription Active: ${newSubState}`
      } else {
        console.error(
          `Subscription status element for user ${userId} not found.`
        )
      }

      displayLabel([
        'review_main_wrapper',
        'alert-success',
        newSubState
          ? 'Account subscription activated successfully'
          : 'Account subscription deactivated successfully'
      ])

      return true
    } else {
      displayLabel([
        'review_main_wrapper',
        'alert-warning',
        'User account subscription update failed!'
      ])
    }

    displayLabel([
      'review_main_wrapper',
      'alert-danger',
      'Failed to update subscription status'
    ])
    return false
  } catch (error) {
    console.error('Error updating subscription:', error)
    runSpinner(true)
  }
}
async function deleteUserAccount (userId, e) {
  try {
    const confirmation = await confirmAction(
      '#body',
      `Deletion action in progress... This action is irreversible. Are you certain you want to proceed?`
    )

    if (confirmation !== 'confirmed!') {
      console.log('User aborted deletion.')
      return
    }
    runSpinner(false, 'Processing...')

    const accountCard = e.target.closest('.user_accountcard')

    if (accountCard) {
      const user = getAuthHandler()
      const { 'auth-token': token } = user

      const apiClient = await API_CLIENT()

      let page = 1
      const baseUrl = `/user/purge-user/${userId}`
      const query = `?page=${page}`
      const url = `${baseUrl}${query}`

      const headers = {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }

      const response = await apiClient.delete(url, { headers })

      if (response.status === 200 && response.statusText === 'OK') {
        const data = response.data?.user_profiles || []
        runSpinner(true)
        accountCard.remove()
        displayLabel([
          'review_main_wrapper',
          'alert-success',
          'user account deleted successfully'
        ])
        return true
      } else {
        runSpinner(false, 'Acknowledged...')
        displayLabel([
          'review_main_wrapper',
          'alert-warning',
          'An error occured: user object could not be deleted'
        ])
      }
    } else {
      console.log('Could not find the user account card.')
    }
  } catch (error) {
    runSpinner(true)
    displayLabel([
      'review_main_wrapper',
      'alert-danger',
      'An error occured: user object could not be deleted'
    ])
    console.error('Error deleting user account:', error)
  }
}
