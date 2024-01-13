import express from 'express'
import cors from 'cors'
import morgan from 'morgan'
import { handleNotSupported, miscellaneous } from './src/utils/miscellaneous.js'
import bodyParser from 'body-parser'
import startUp from './src/workers/startup.js'
import routesHandler from './src/workers/routesHandler.js'
import profileGeneratorHandler from './src/workers/profileGeneratorRoutesHandler.js'
const app = express()

app.use(cors())
app.use(bodyParser.json())
app.use(express.urlencoded({ extended: true }))
app.use(express.static('public'))
app.use(express.json())
app.use(morgan('tiny'))
miscellaneous(app)
profileGeneratorHandler(app)
routesHandler(app)
handleNotSupported(app)
startUp(app)
