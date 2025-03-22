import bodyParser from 'body-parser'
import cors from 'cors'
import express from 'express'
import morgan from 'morgan'
import { dynoActivator, wakeupService } from './middleware/ping_service.js'
import { handleNotSupported, miscellaneous } from './src/utils/miscellaneous.js'
import profileGeneratorHandler from './src/workers/profileGeneratorRoutesHandler.js'
import routesHandler from './src/workers/routesHandler.js'
import startUp from './src/workers/startup.js'

const app = express()

app.set('trust proxy', 1)
app.use(cors())
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))
app.use(express.json())
app.use(morgan('tiny'))
app.use(wakeupService)

miscellaneous(app)
profileGeneratorHandler(app)
routesHandler(app)
handleNotSupported(app)
startUp(app)
dynoActivator()
