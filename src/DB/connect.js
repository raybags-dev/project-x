import mongoose from 'mongoose'
import { checkEnvFile } from '../../middleware/generalHandlers.js'
import { devLogger } from '../loggers/devLogger.js'

export default async function connectToDB (
  url,
  isConnect,
  maxRetries = 3,
  delay = 5000
) {
  if (!isConnect) {
    devLogger('Database connection skipped.', 'warn')
    return
  }

  let attempts = 0

  while (attempts < maxRetries) {
    try {
      mongoose.set('strictQuery', true)
      devLogger(`Attempt ${attempts + 1}: Connecting to database...`, 'info')

      const connection = await mongoose.connect(url, {
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 150000
      })

      const adminDb = connection.connection.db.admin()
      const dbVersion = await adminDb.command({ buildInfo: 1 })
      devLogger(`MongoDB Version: ${dbVersion.version}`, 'info')

      const majorVersion = parseInt(dbVersion.version.split('.')[0], 10)
      if (majorVersion < 4) {
        throw new Error('Unsupported MongoDB version.')
      }

      devLogger('Connected to Database ✓ ✓ ✓ ✓', 'info')
      return connection
    } catch (error) {
      attempts++
      if(error.message.includes('ECONNREFUSED')) {
        devLogger('Connection refused. Please check if MongoDB is running.', 'error')
        return 
      }
      if(error.message.includes('Make sure the first parameter to')) {
        devLogger('Invalid connection string. Please check your MongoDB URI.\n> ❌ Its also possible the .env file ie empty...', 'error')
        checkEnvFile()
        return
      }

       devLogger(`Database connection error: ${error.message}`, 'error')

      if (attempts >= maxRetries) {
        devLogger(
          'Max retries reached. Failed to connect to the database','error' )
        devLogger('\n============ \nDatabase connection failed!.\n=========\n','error')
        return 
      }

      devLogger(`Retrying in ${delay / 1000} seconds...`, 'warn')
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

}
