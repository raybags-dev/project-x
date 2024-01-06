import mongoose from 'mongoose'

export default function connectToDB (url, isConnect) {
  if (isConnect) {
    try {
      mongoose.set('strictQuery', true)
      console.log('connecting...')
      return mongoose
        .connect(url, {
          useNewUrlParser: true,
          useUnifiedTopology: true
        })
        .then(() => {
          console.log('connected to Database ✓ ✓ ✓ ✓')
        })
        .catch(error => {
          console.error('Database connection error:', error.message)
          throw new Error(
            'Failed to connect to the database. Please try again later.'
          )
        })
    } catch (e) {
      console.error(e.message)
    }
  }
  return console.log('Database connection failed.')
}
