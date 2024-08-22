import mongoose from 'mongoose'
import { devLogger } from '../utils/devLogger.js'

export default async function connectToDB (url, isConnect) {
  if (isConnect) {
    try {
      mongoose.set('strictQuery', true)
      // mongoose.set('debug', true)
      devLogger('connecting...', 'info')

      const connection = await mongoose.connect(url, {
        // useNewUrlParser: true,
        // useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 150000
      })

      const adminDb = connection.connection.db.admin()
      const dbVersion = await adminDb.command({ buildInfo: 1 })
      devLogger(`MongoDB Version: ${dbVersion.version}`, 'info')

      const versionComponents = dbVersion.version.split('.')
      const majorVersion = parseInt(versionComponents[0], 10)

      if (majorVersion < 4) {
        throw new Error('Unsupported MongoDB version.')
      }

      devLogger('connected to Database ✓ ✓ ✓ ✓', 'info')
      return connection
    } catch (error) {
      devLogger(`Database connection error: ${error.message}`, 'error')
      throw new Error(
        'Failed to connect to the database. Please try again later.'
      )
    }
  }
  return devLogger('Database connection failed.', 'warn')
}
