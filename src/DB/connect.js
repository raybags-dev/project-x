import mongoose from 'mongoose'

// export default function connectToDB (url, isConnect) {
//   if (isConnect) {
//     try {
//       mongoose.set('strictQuery', true)
//       // mongoose.set('debug', true)
//       console.log('connecting...')
//       return mongoose
//         .connect(url, {
//           useNewUrlParser: true,
//           useUnifiedTopology: true,
//           serverSelectionTimeoutMS: 10000,
//           connectTimeoutMS: 150000
//         })
//         .then(() => {
//           console.log('connected to Database ✓ ✓ ✓ ✓')
//         })
//         .catch(error => {
//           console.error('Database connection error:', error.message)
//           throw new Error(
//             'Failed to connect to the database. Please try again later.'
//           )
//         })
//     } catch (e) {
//       console.error(e)
//     }
//   }
//   return console.log('Database connection failed.')
// }

export default async function connectToDB (url, isConnect) {
  if (isConnect) {
    try {
      mongoose.set('strictQuery', true)
      // mongoose.set('debug', true)
      console.log('connecting...')

      const connection = await mongoose.connect(url, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverSelectionTimeoutMS: 10000,
        connectTimeoutMS: 150000
      })

      const adminDb = connection.connection.db.admin()
      const dbVersion = await adminDb.command({ buildInfo: 1 })
      console.log('MongoDB Version:', dbVersion.version)

      const versionComponents = dbVersion.version.split('.')
      const majorVersion = parseInt(versionComponents[0], 10)

      if (majorVersion < 4) {
        throw new Error('Unsupported MongoDB version.')
      }

      console.log('connected to Database ✓ ✓ ✓ ✓')
      return connection
    } catch (error) {
      console.error('Database connection error:', error.message)
      throw new Error(
        'Failed to connect to the database. Please try again later.'
      )
    }
  }
  return console.log('Database connection failed.')
}
