import { LOGIN_HTML } from '../components/login.js'
import { MAIN_PAGE } from '../components/main_container.js'
import { PLUGINS } from '../utils/plugins.js'
const { handleCookieAcceptance } = PLUGINS
import { getAuthHandler } from '../components/auth.js'
;(async () => {
  const cookieConcent = await handleCookieAcceptance()
  if (!cookieConcent) return

  try {
    const user = await getAuthHandler()
    if (user?.isAdmin) return await MAIN_PAGE()
    LOGIN_HTML()
  } catch (error) {
    console.log((error.message && error.message) || error)
  }
})()
