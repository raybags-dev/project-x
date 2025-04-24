import { logger } from '../loggers/logger.js'
import { PROFILE_MODEL } from '../models/profileModel.js'

export async function googleReviewUpdateHandler (req, res) {
  try {
    const user = req.locals.user
    const userProfile = await PROFILE_MODEL.findOne({ userId: user.userId })

    if (!userProfile)
      return {
        status: 'failed',
        message: 'Account profile could not be found'
      }

    try {
      res.status(200).json({
        status: 'Acknoledge!',
        message:
          'This remove can not be updated independently - Instead delete the review and them pull in new page reviews.'
      })
    } catch (error) {
      return logger(`Error:  update failed: ${error}`, 'error')
    }
  } catch (error) {
    return logger(`Error updating review: ${error}`, 'error')
  }
}
