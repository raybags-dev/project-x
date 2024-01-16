import connectDB from '../DB/connect.js'

import { config } from 'dotenv'
config()
const { MONGO_URI } = process.env
export default async app => {
  const PORT = process.env.PORT || 3001

  app.use('/raybags/v1/review-crawler/*', (req, res, next) => {
    let newUrl = req.url.replace(
      '/raybags/v1/review-crawler/',
      `http://${PORT}/raybags/v1/review-crawler/`
    )
    req.url = newUrl
    next()
  })

  app.listen(PORT, async () => {
    try {
      console.log(`server running on port: ${PORT}`)
      await connectDB(MONGO_URI, true)
    } catch (e) {
      console.log(e.message)
    }
  })
}
