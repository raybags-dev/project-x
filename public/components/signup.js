import { LOGIN_HTML } from './login.js'
import { PLUGINS } from '../utils/plugins.js'
import { MAIN_PAGE } from './main_container.js'
const { justForAMoment, displayLabel, API_CLIENT, runSpinner, loginUser } =
  PLUGINS

const apiClient = await API_CLIENT()

export async function SIGNUP_HTML () {
  let pageContent = `
      <nav class="navbar navbar-expand-lg">
      <div class="container-fluid">
          <a class="navbar-brand p-2 mb-1" href="#">
              <img src="../images/logo.png" alt="" width=40" height="40" style="border-radius: 50%;"
                  class="d-inline-block align-text-top">
          </a>
          <ul class="navbar-nav">
              <li class="nav-item">
                  <a id="to_login_p" class="nav-link active text-white" aria-current="page" href="#">LOG IN</a>
              </li>
          </ul>
      </div>
  </nav>
  <main id="review_main_wrapper" class="container container-fluid my-10">
      <div class="container sign___up container-fluid shadow">
          <h3 class="p-2 text-white ">SIGNUP</h3>
          <form class="p-3 rounded pt-2 text-white" id="signup_form">
              <div class="mb-3">
                  <label for="exampleInputName" class="form-label">Name</label>
                  <input type="text" name="name" class="form-control" id="exampleInputName"
                      placeholder="Enter your name" required>
                  <div class="invalid-feedback">Please enter your name.</div>
              </div>
              <div class="mb-3">
                  <label for="exampleInputEmail1" class="form-label">Email address</label>
                  <input type="email" name="email" class="form-control" placeholder="Enter your email"
                      id="exampleInputEmail1" aria-describedby="emailHelp" required>
                  <div class="invalid-feedback">Please enter a valid email address.</div>
              </div>
              <div class="mb-3">
                  <label for="exampleInputPassword1" class="form-label">Password</label>
                  <input type="password" name="password" autocomplete="current-password webauthn" placeholder="Enter your password" class="form-control"
                      id="exampleInputPassword1" required>
                  <div class="invalid-feedback">Please enter your password.</div>
              </div>
              <div class="d-grid gap-2">
                  <button id="signup_bt" type="submit" class="btn shadow signup_btn text-white" type="button">SUBMIT</button>
              </div>
          </form>
      </div>
  </main>
    `
  document.getElementById('innerBody').innerHTML = pageContent

  const navbarBrand = document.querySelector('#to_login_p')
  navbarBrand?.addEventListener('click', async () => {
    LOGIN_HTML()
  })

  const signupForm = document.querySelector('#signup_form')
  signupForm?.addEventListener('submit', async event => {
    event.preventDefault()
    const formData = new FormData(signupForm)

    const user = {
      name: formData.get('name'),
      email: formData.get('email'),
      password: formData.get('password')
    }

    try {
      justForAMoment('Creating...')
      const url = '/create-user'
      const response = await apiClient.post(url, user, {
        headers: { 'Content-Type': 'application/json' }
      })

      const { status } = await response

      if (status === 201) {
        justForAMoment('Almost done')

        const userIsLoggedIn = await loginUser(user)

        if (userIsLoggedIn && userIsLoggedIn.status === 200) {
          displayLabel([
            'review_main_wrapper',
            'alert-success',
            'Login successful 😀'
          ])

          setTimeout(async () => {
            history.pushState(null, null, '/')
            return await MAIN_PAGE()
          }, 800)
        } else {
          displayLabel([
            'review_main_wrapper',
            'alert-danger',
            'Login failed 😀'
          ])
        }
        return
      }

      displayLabel([
        'review_main_wrapper',
        'alert-danger',
        'Oops. Something went wrong, try again later.'
      ])
      setTimeout(() => runSpinner(true), 3000)
    } catch (error) {
      console.error('Signup error:', error)
    } finally {
      runSpinner(true)
    }
  })
}
