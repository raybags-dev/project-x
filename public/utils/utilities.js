import { displayLabel } from '../components/apiCallHandlers.js'

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
