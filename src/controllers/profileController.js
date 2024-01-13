import { PROFILE_MODEL } from '../models/profileModel.js'
import { REVIEW } from '../models/documentModel.js'
import { USER_MODEL, USER_ID_MODEL } from '../models/user.js'
import { validateSuperUserToken } from '../../middleware/auth.js'

export async function deleteAccountProfile (req, res) {
  try {
    const userId = req.locals.user.userId

    const profile = await PROFILE_MODEL.findOne({ userId })

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found for the user' })
    }

    const profileInstance = new PROFILE_MODEL(profile)
    await profileInstance.beforeDelete()

    await PROFILE_MODEL.deleteOne({ userId })

    return res.status(200).json({ message: 'Profile deleted successfully' })
  } catch (error) {
    console.error('Error in deleteAccountProfile:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
export async function deleteAccountProfileAndAllDocuments (req, res) {
  try {
    const userId = req.locals.user.userId
    const profile = await PROFILE_MODEL.findOne({ userId })

    if (!profile) {
      return res.status(404).json({ error: 'Profile not found for this user' })
    }
    await PROFILE_MODEL.deleteOne({ userId })
    await REVIEW.deleteMany({ userId })

    return res
      .status(200)
      .json({ message: 'Profile and associated reviews deleted successfully' })
  } catch (error) {
    console.error('Error in deleteAccountProfile:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
export async function pargeUserPublic (req, res) {
  try {
    const isAdmin = await req.locals.user?.isAdmin
    const userId = await req.locals.user?.userId

    if (!isAdmin || !userId) return res.status(403).json({ error: 'FORBIDDE' })

    const review = await REVIEW.deleteMany({ userId })
    const profile = await PROFILE_MODEL.deleteOne({ userId })
    const user = await USER_MODEL.deleteOne({ userId })

    return res.status(200).json({
      message: 'User, profile purged successfully!',
      details: {
        'documents-deleted': review.acknowledged && review.deletedCount,
        reviews: {
          isreviewsDeleted: review.acknowledged && review.acknowledged,
          count: review.deletedCount && review.deletedCount
        },
        profile: {
          isDeleted: profile.acknowledged && profile.acknowledged,
          count: profile.deletedCount && profile.deletedCount
        },
        user: {
          isDeleted: user.acknowledged && user.acknowledged,
          count: user.deletedCount && user.deletedCount
        }
      }
    })
  } catch (error) {
    console.error('Error in pargeUserPublic:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}
export async function pargeUserPrivate (req, res) {
  try {
    const superUserToken = await req.locals.user.superUserToken
    const userIsSuperUser = USER_MODEL.isSuperUser(superUserToken)

    if (!userIsSuperUser) return res.status(403).json({ error: 'FORBIDDE' })

    const user_Id = req.params._id
    const targetUser = await USER_MODEL.findOne({ _id: user_Id })
    if (!targetUser)
      return res.status(200).json({ message: 'user could not be found!' })
    const userId = targetUser.userId

    const review = await REVIEW.deleteMany({ userId })
    const profile = await PROFILE_MODEL.deleteOne({ userId })
    const user = await USER_MODEL.deleteOne({ user_Id })
    await USER_ID_MODEL.deleteOne({ _id: userId })

    return res.status(200).json({
      message: 'User, profile purged successfully!',
      details: {
        reviews: {
          isreviewsDeleted: review.acknowledged && review.acknowledged,
          count: review.deletedCount && review.deletedCount
        },
        profile: {
          isDeleted: profile.acknowledged && profile.acknowledged,
          count: profile.deletedCount && profile.deletedCount
        },
        user: {
          isDeleted: user.acknowledged && user.acknowledged,
          count: user.deletedCount && user.deletedCount
        }
      }
    })
  } catch (error) {
    console.error('Error in pargeUserPrivate:', error)
    return res.status(500).json({ error: 'Internal Server Error' })
  }
}

export async function validateCaller (req, res) {
  try {
    const requestToken = req.headers['admin-token'] || ''
    const superUserToken = req.locals.user.superUserToken

    const isValid = validateSuperUserToken(superUserToken, requestToken)

    if (isValid) {
      return res
        .status(200)
        .json({ status: 'PASS', state: isValid, message: 'Valid Token' })
    }

    res.status(403).json({ status: 'UNAUTHORIZED', message: 'Invalid Token' })
  } catch (e) {
    console.error('Error in validateCaller:', e)
    res.status(500).json({ status: 'ERROR', message: 'Internal Server Error' })
  }
}
