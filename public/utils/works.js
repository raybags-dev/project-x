/*
import { PLUGINS } from './plugins.js'
const { API_CLIENT } = PLUGINS

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
        await PLUGINS.generateReviewCard(doc)
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

PLUGINS.generateReviewCard = async function (
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
              <img src="" style="width:30%;max-width:100px !important;min-width:57px !important;max-height:100px !important;border-radius:3px" class="img-thumbnail review-logo-${uuid}-${internalId} bg-transparent" alt="...">
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

  // Ensure elements are correctly targeted for each card
  const cardElement = document.getElementById(_id)
  PLUGINS.createSubratings(
    subratings,
    cardElement.querySelector(`[data-subratings="${authorExternalId}"]`)
  )
  PLUGINS.createRating(
    rating,
    cardElement.querySelector(
      `[data-guest-rating="rating-${authorExternalId}"]`
    )
  )
  PLUGINS.addReviewResponse(
    propertyResponse,
    cardElement.querySelector(`.card-${_id}`),
    hasPropertyResponse,
    _id
  )
  PLUGINS.responseButtonVisibility(
    hasPropertyResponse,
    cardElement.querySelector(`.has-response-${uuid}`)
  )
  PLUGINS.reviewCount(
    authorReviewCount,
    cardElement.querySelector(`[data-subratings="${authorExternalId}"]`)
  )
  PLUGINS.getSiteLogoPath(
    reviewSiteSlug,
    cardElement.querySelector(`.review-logo-${uuid}-${internalId}`)
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
}
*/
