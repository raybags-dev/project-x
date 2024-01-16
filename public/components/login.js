import { SIGNUP_HTML } from './signup.js'
import { passwordNotice, disableElement } from '../utils/update.js'
import { MAIN_PAGE } from './main_container.js'

import { PLUGINS } from '../utils/plugins.js'
const { setAuthHandler, displayLabel, justForAMoment, runSpinner, loginUser } =
  PLUGINS

export async function LOGIN_HTML () {
  let pageContent = `
    <nav class="navbar navbar-expand-lg">
    <div class="container-fluid">
        <a class="navbar-brand p-2 mb-1" href="#">
            <img src="../images/logo.png" alt="" width=40" height="40" style="border-radius: 50%;filter: gray(100%)"
                class="d-inline-block align-text-top">
        </a>
  
        <ul class="navbar-nav">
            <li class="nav-item">
                <a id="to_sigup_p" class="nav-link active text-white" aria-current="page" href="#">SIGNUP</a>
            </li>
        </ul>
    </div>
  </nav>
  <main id="review_main_wrapper" class="container container-fluid my-10">
    <div class="container log___in container-fluid shadow">
        <h3 class="p-2 text-white text-muted">LOGIN</h3>
        <form id="login___form" class=" p-3 rounded pt-2 text-white container-fluid">
            <div class="mb-3">
                <label for="exampleInputEmail1" class="form-label text-muted">Email address</label>
                <input type="email" name="email" class="form-control" placeholder="Enter your email"
                    id="exampleInputEmail1" aria-describedby="emailHelp" required>
                <div class="invalid-feedback">Please enter a valid email address.</div>
            </div>
            <div class="mb-3">
                  <label for="exampleInputPassword1" class="form-label text-muted">Password</label>
                  <input type="password" name="password" placeholder="Enter your password" class="form-control"
                      id="exampleInputPassword1" autocomplete="current-password webauthn"  required>
                  <div class="invalid-feedback">Please enter your password.</div>
            </div>
            <div id="checker" class="form-check form-switch mt-3 mb-3 hide_2">
                      <input class="form-check-input"  type="checkbox" role="switch" id="flexSwitchCheckDefault">
                      <label class="form-check-label text-muted" for="flexSwitchCheckDefault">Forgot password</label>
            </div>
            <div class="d-grid gap-2">
                <button type="submit"  class="btn shadow login_btn text-white text-muted">SUBMIT</button>
            </div>
        </form>
    </div>
  </main>
      `
  document.getElementById('innerBody').innerHTML = pageContent

  const navbarBrand = document.querySelector('#to_sigup_p')
  navbarBrand?.addEventListener('click', async () => {
    SIGNUP_HTML()
  })

  const change__checkbox = document.getElementById('flexSwitchCheckDefault')
  change__checkbox.addEventListener('change', async function () {
    if (change__checkbox.checked) {
      await disableElement(true, '.login_btn')
      await disableElement(true, '#exampleInputPassword1')
      setTimeout(async () => await passwordNotice(), 80)
    } else {
      await disableElement(false, '.login_btn')
      await disableElement(false, '#exampleInputPassword1')
    }
  })

  const loginForm = document.querySelector('#login___form')
  loginForm?.addEventListener('submit', async event => {
    justForAMoment()

    event.preventDefault()
    const formData = new FormData(loginForm)
    const email = formData.get('email')
    const password = formData.get('password')

    try {
      const loginResponse = await loginUser({ email, password })

      if (loginResponse.status === 200) {
        justForAMoment('Almost done')
        const { user } = loginResponse.data
        const { headers } = loginResponse

        const userCreds = await setAuthHandler(user, headers)
        const { isAdmin } = userCreds

        if (isAdmin) {
          sessionStorage.setItem('redirected', true)
          displayLabel([
            'review_main_wrapper',
            'alert-success',
            'Login successful 😀'
          ])
          setTimeout(async () => {
            runSpinner(true)
            history.pushState(null, null, '/')
            return await MAIN_PAGE()
          }, 800)
        }
      }
    } catch (error) {
      runSpinner(false, 'Failed!')
      const errorMessage = error?.response?.data?.error || 'An error occurred.'
      displayLabel(['review_main_wrapper', 'alert-danger', `${errorMessage}`])
      if (errorMessage.includes('Unauthorized')) {
        document.querySelector('#checker').classList.add('hide_2')
      }
      if (errorMessage.trim() === 'Invalid email or password') {
        document.querySelector('#checker').classList.remove('hide_2')
      }
      setTimeout(() => runSpinner(true), 3000)
    }
  })
}
