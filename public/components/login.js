import { SIGNUP_HTML } from './signup.js'
import { MAIN_PAGE } from './main_container.js'
import { PLUGINS } from '../utils/plugins.js'

const { setAuthHandler, displayLabel, justForAMoment, runSpinner, loginUser } =
  PLUGINS

export async function LOGIN_HTML () {
  let pageContent = `
  <nav class="navbar navbar-expand-lg shadow shadow-sm bg-light text-dark">
      <div class="container-fluid">
          <a class="navbar-brand p-2 mb-1" href="#">
              <img src="../images/logo.png" alt="" width=40" height="40" style="border-radius: 50%;filter: gray(100%)"
                  class="d-inline-block align-text-top">
          </a>
    
          <ul class="navbar-nav">
              <li class="nav-item">
                  <a id="to_sigup_p" class="nav-link active text-dark" aria-current="page" href="#">SIGNUP</a>
              </li>
          </ul>
      </div>
  </nav>
  <main id="review_main_wrapper" class="container container-fluid my-10">
    <div class="container log___in container-fluid shadow shadow-lg bg-light">
        <h3 class="p-2 text-dark ">LOGIN</h3>
        <form id="login___form" class=" p-3 rounded pt-2 text-dark container-fluid">
            <div class="mb-3 p-0">
                <label for="exampleInputEmail1" class="form-label">Email address</label>
                <input type="email" name="email" class="form-control shadow shadow-sm" placeholder="Enter your email"
                    id="exampleInputEmail1" aria-describedby="emailHelp" required>
                <div class="invalid-feedback">Please enter a valid email address.</div>
            </div>
            <div class="mb-3">
                  <label for="exampleInputPassword1" class="form-label">Password</label>
                  <input type="password" name="password" placeholder="Enter your password" class="form-control shadow shadow-sm"
                      id="exampleInputPassword1" autocomplete="current-password webauthn"  required>
                  <div class="invalid-feedback">Please enter your password.</div>
            </div>
            <div id="checker" class="form-check form-switch mt-3 mb-3 hide_2">
                      <input class="form-check-input shadow shadow-sm"  type="checkbox" role="switch" id="flexSwitchCheckDefault">
                      <label class="form-check-label" for="flexSwitchCheckDefault">Forgot password</label>
            </div>
            <div class="container">
                <button type="submit"  class="btn btn-lg shadow shadow-lg btn-outline-success login_btn">SUBMIT</button>
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
      } else {
        displayLabel([
          'review_main_wrapper',
          'alert-danger',
          'Invalid email or password'
        ])
      }
    } catch (error) {
      runSpinner(false, 'Failed!')
      const errorMessage = error?.response?.data?.error || 'An error occurred.'
      displayLabel(['review_main_wrapper', 'alert-danger', `${errorMessage}`])
      setTimeout(() => runSpinner(true), 3000)
    }
  })
}
