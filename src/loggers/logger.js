import 'dotenv/config'
import fs from 'fs'
import path from 'path'
import winston from 'winston'

const { NODE_ENV } = process.env

const { existsSync, mkdirSync } = fs
export async function logger (message, level = 'info') {
  const logsDirectory = 'logs'

  const isDevelopment = NODE_ENV === 'development'

  if (isDevelopment && !existsSync(logsDirectory)) {
    console.log(`Logs directory does not exist, creating: ${logsDirectory}`)
    mkdirSync(logsDirectory, { recursive: true })
    console.log(`Logs directory created at: ${logsDirectory}`)
  }

  const infoLogFilePath = path.join(logsDirectory, 'info.log')
  const warnLogFilePath = path.join(logsDirectory, 'warn.log')
  const errorLogFilePath = path.join(logsDirectory, 'error.log')

  winston.configure({
    transports: [
      new winston.transports.Console(),
      new winston.transports.File({ filename: infoLogFilePath, level: 'info' }),
      new winston.transports.File({ filename: warnLogFilePath, level: 'warn' }),
      new winston.transports.File({
        filename: errorLogFilePath,
        level: 'error'
      })
    ]
  })

  const timestamp = new Date().toISOString()
  const logLevels = ['info', 'warn', 'error']

  if (!logLevels.includes(level.toLowerCase())) {
    console.log(message)
    return
  }

  try {
    let logMessage = `[${timestamp}] [${level.toUpperCase()}]: `

    if (Array.isArray(message)) {
      console.log(message)
    } else if (typeof message === 'object') {
      console.info([message])
    } else {
      logMessage += message
    }

    switch (level.toLowerCase()) {
      case 'info':
        console.log(logMessage)
        winston.info(logMessage)
        break
      case 'warn':
        console.log(logMessage)
        winston.warn(logMessage)
        break
      case 'error':
        console.log(logMessage)
        winston.error(logMessage)
        break
      default:
        console.log(logMessage)
        winston.info(logMessage)
    }
  } catch (error) {
    console.error('> Error loading chalk:', error)
    console.log(message)
    winston.info(message)
  }
}
