import connectDB from '../DB/connect.js'
import { devLogger } from '../utils/devLogger.js'
import { clearDevPort } from '../utils/cleanUp.js'

import { config } from 'dotenv'
config()
const { MONGO_URI } = process.env

async function starterLogger (port) {
  try {
    const memoryUsage = process.memoryUsage()
    const currentMemory =
      Math.round((memoryUsage.heapUsed / 1024 / 1024) * 100) / 100
    const currentTime = new Date().toLocaleString()
    const environment = process.env.NODE_ENV || 'development'
    const currentUser = process.env.USER || 'guest_user'
    const logname = process.env.LOGNAME || 'undefined'

    devLogger(`Memory usage: ${currentMemory} MB`, 'info')
    devLogger(`Current time: ${currentTime}`, 'info')
    devLogger(`Environment: ${environment}`, 'info')
    devLogger(`User: ${currentUser}`, 'info')
    devLogger(`Log name: ${logname}`, 'info')
    devLogger(`Server running on port: ${port}`, 'info')
  } catch (e) {
    devLogger(`Error occurred in starterLogger function: ${e}`, 'error')
  }
}
const startServer = async (app, port, attempt = 1) => {
  try {
    await new Promise((resolve, reject) => {
      const server = app.listen(port, async () => {
        await starterLogger(port)
        await connectDB(MONGO_URI, true)
        resolve()
      })
      server.on('error', reject)
    })
  } catch (err) {
    if (err.code === 'EADDRINUSE') {
      devLogger(
        `Port ${port} is already in use. Attempting to resolve...`,
        'warn'
      )
      try {
        await clearDevPort(port)
      } catch (cleanupErr) {
        devLogger(
          `Error checking or killing port ${port}: ${cleanupErr.message}`,
          'error'
        )
        throw cleanupErr
      }

      if (attempt < 3) {
        devLogger(`Retrying to start server on port ${port}...`, 'info')
        await startServer(app, port, attempt + 1)
      } else {
        devLogger(`Failed to start server after ${attempt} attempts.`, 'error')
        process.exit(1)
      }
    } else {
      devLogger(`Server error: ${err}`, 'error')
      process.exit(1)
    }
  }
}
export default async function (app) {
  try {
    const PORT = process.env.PORT || 3001

    app.use('/raybags/v1/review-crawler/*', (req, res, next) => {
      let newUrl = req.url.replace(
        '/raybags/v1/review-crawler/',
        `http://${PORT}/raybags/v1/review-crawler/`
      )
      req.url = newUrl
      next()
    })

    // Start server with retry logic
    await startServer(app, PORT)

    // Handle cleanup on process termination
    const cleanUpAndExit = () => {
      devLogger('Cleaning up and exiting...', 'info')
      process.exit(0)
    }

    process.on('SIGINT', cleanUpAndExit)
    process.on('SIGTERM', cleanUpAndExit)
    process.on('exit', () => {
      devLogger('Process exit: performing cleanup...', 'info')
    })
  } catch (error) {
    let msg = error.message
    if (msg.includes('Cannot read properties of null (reading')) {
      devLogger(
        `Error:' Invalid congiguration build. See <configurations/configs.json>`,
        'warn'
      )
    }
    devLogger(`Error during startup:' ${error}`, 'error')
    process.exit(1)
  }
}
