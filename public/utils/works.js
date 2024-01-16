import { PLUGINS } from './plugins.js'
const { API_CLIENT } = PLUGINS

// Main page loader

// search db
export async function searchDatabase () {
  const searchingInput = document.querySelector('#search____input')
  let inputValue = searchingInput?.value.trim().toLowerCase()

  try {
    runSpinner(false, 'Searching...')
    const { token } = JSON.parse(sessionStorage.getItem('token'))
    let url = '/uploader/search-docs'

    const headers = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }

    const body = {
      searchQuery: inputValue
    }

    const res = await API_CLIENT.post(url, body, { headers })

    if (res.statusText === 'OK') {
      runSpinner(true)
      const { documents: response } = await res.data
      response.forEach(async doc => {
        document
          .querySelectorAll('.col')
          ?.forEach(card => card.classList.add('hide'))
        await CARD(doc)
      })
      if (response.length > 0) {
        displayLabel([
          'review_main_wrapper',
          'alert-success',
          `Search successful, (${response.length}) documents found!`
        ])
      }
    } else {
      runSpinner(true)
      displayLabel([
        'review_main_wrapper',
        'alert-warning',
        'No matches were found!'
      ])
      document
        .querySelectorAll('.col')
        ?.forEach(card => card.classList.remove('hide'))
    }
  } catch (error) {
    runSpinner(true)
    if (error) {
      const statusCode = error.response.status
      const statusText = error.response.statusText
      const errorData = error.response.data

      if (statusCode === 404 && statusText == 'Not Found') {
        document
          .querySelectorAll('.col')
          ?.forEach(card => card.classList.add('hide'))
        displayLabel([
          'review_main_wrapper',
          'alert-warning',
          'Resource not found.'
        ])
        return
      }
      if (statusCode === 401) {
        displayLabel([
          'review_main_wrapper',
          'alert-danger',
          'Unauthorized access.'
        ])
        return
      }

      displayLabel([
        'review_main_wrapper',
        'alert-danger',
        'Error searching documents.'
      ])
      console.error('Error:', error.message)
    }
  } finally {
    runSpinner(true)
  }
}
