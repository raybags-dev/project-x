import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import path from 'path'
import { fileURLToPath } from 'url'

import { dynoActivator, wakeupService } from './middleware/ping_service.js'
import startUp from './src/startup.js'
import {
  injectNonceToLocalScripts,
  setupNoncedRoute
} from './src/utilities//injectionUtility.js'
import {
  handleNotSupported,
  miscellaneous
} from './src/utilities/miscellaneous.js'
import { handleCSP } from './src/utilities/utilities.js'
import generalRoutesHandler from './src/workers/generalRoutesHandler.js'
import profileGeneratorHandler from './src/workers/profileGenRoutesHandler.js'
import reviewGeneratorHandler from './src/workers/reviewGenRoutesHandler.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const app = express()

handleCSP(app)
setupNoncedRoute(app)
injectNonceToLocalScripts(app)

app.set('trust proxy', 1)
app.use(cors())
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(morgan('tiny'))

app.use(express.static(path.join(__dirname, 'public')))

app.use(wakeupService)

miscellaneous(app)
profileGeneratorHandler(app)
reviewGeneratorHandler(app)
generalRoutesHandler(app)
startUp(app)

handleNotSupported(app)

dynoActivator()

export default app
