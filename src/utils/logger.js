import winston from 'winston'
import fs from 'fs'
import path from 'path'

const { existsSync, mkdirSync } = fs

export async function logger (message, level = 'info') {
  const logsDirectory = 'logs'

  if (!existsSync(logsDirectory)) {
    mkdirSync(logsDirectory)
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
    const chalk = await import('chalk')

    let logMessage = `[${timestamp}] [${level.toUpperCase()}]: `

    if (Array.isArray(message)) {
      console.table(message)
    } else if (typeof message === 'object') {
      console.table([message])
    } else {
      logMessage += message
    }

    switch (level.toLowerCase()) {
      case 'info':
        console.log(chalk.default.greenBright(logMessage))
        winston.info(logMessage)
        break
      case 'warn':
        console.log(chalk.default.yellow(logMessage))
        winston.warn(logMessage)
        break
      case 'error':
        console.log(chalk.default.red(logMessage))
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
