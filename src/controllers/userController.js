import { USER_MODEL, USER_ID_MODEL } from '../models/user.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { sendEmail } from '../../middleware/emailer.js'
import { REVIEW } from '../models/documentModel.js'
import { config } from 'dotenv'
config()

const {
  RECIPIENT_EMAIL,
  AWS_BUCKET_NAME,
  AWS_REGION,
  SECRET_ADMIN_TOKEN,
  SUPER_USER_TOKEN
} = process.env

export async function CreateUserController (req, res) {
  try {
    const secret = SECRET_ADMIN_TOKEN
    const { name, email, password, superUserToken } = req.body

    const isAdminUser = secret === SECRET_ADMIN_TOKEN
    const isSuperUser = superUserToken === SUPER_USER_TOKEN

    if (!isAdminUser && isSuperUser) {
      return res
        .status(403)
        .send({ error: 'Forbidden - SuperUser must be an Admin' })
    }

    const existingUser = await USER_MODEL.findOne({ email })
    if (existingUser) {
      return res.status(409).send({ error: 'User already exists' })
    }

    const newUserId = await USER_ID_MODEL.create({})
    const userId = newUserId._id

    let user
    const isSubscribed = true

    if (isAdminUser || isSuperUser) {
      user = new USER_MODEL({
        name,
        email,
        password,
        userId,
        isAdmin: true,
        superUserToken,
        isSuperUser: isSuperUser,
        isSubscribed
      })
    } else {
      user = new USER_MODEL({
        name,
        email,
        password,
        userId,
        isAdmin: false,
        isSubscribed
      })
    }

    await user.save()

    const token = user.generateAuthToken()

    const createUserEmailData = {
      title: 'User account created successfully',
      body: `A user:\n${user}\n has successfully been created in your S3 bucket: "${AWS_BUCKET_NAME}" in: ${AWS_REGION}.`
    }
    await sendEmail(createUserEmailData, RECIPIENT_EMAIL)

    res.status(201).send({
      state: 'successful',
      message: 'user created',
      user: { name, email, isAdmin: user.isAdmin },
      token
    })
  } catch (error) {
    console.error('Error processing request:', error.message)
    res.status(400).send({ error: error.message })
  }
}
export async function LoginController (req, res) {
  try {
    const user = await USER_MODEL.findOne({ email: req.body.email })
    const token = user.generateAuthToken()

    const userObject = user.toObject()
    delete userObject.password
    res.status(200).json({ user: userObject, token })
  } catch (error) {
    console.log(error.message)
    res.status(500).json({ error: 'Server error' })
  }
}
export async function GetUserController (req, res) {
  try {
    const email = req.locals.user.email
    const isSuperUser = await USER_MODEL.isSuperUser(
      req.locals.user.superUserToken
    )
    let user = {}
    let updatedUser = {}
    let count
    if (isSuperUser) {
      user = await USER_MODEL.findOne({ email })
      if (!user) return res.status(404).json('User not found!')

      const userProfiles = await PROFILE_MODEL.find({
        userId: user.userId
      })

      count = await REVIEW.countDocuments({ userId: user.userId })
      updatedUser = {
        ...user.toObject(),
        userProfiles,
        DocumentCount: count
      }

      res.status(200).json(updatedUser)
      return
    }

    user = await USER_MODEL.findOne(
      { email },
      {
        token: 0,
        password: 0,
        version: 0,
        __v: 0,
        superUserToken: 0,
        isSuperUser: 0
      }
    )

    if (!user) return res.status(404).json('User not found!')

    const userProfiles = await PROFILE_MODEL.find({
      userId: user.userId
    })

    count = await REVIEW.countDocuments({ userID: user.userId })
    updatedUser = {
      ...user.toObject(),
      userProfiles,
      DocumentCount: count
    }
    res.status(200).json(updatedUser)
  } catch (e) {
    console.log(e)
  }
}
export async function GetAllUsersController (req, res) {
  try {
    const isSuperUser = await USER_MODEL.isSuperUser(
      req.locals.user.superUserToken
    )
    if (!isSuperUser)
      return res.status(401).json({ error: 'Unauthorized - Not a super user' })

    const currentUser = req.locals.user
    const perPage = 10
    let page = parseInt(req.query.page) || 1

    const skip = (page - 1) * perPage

    const users = await USER_MODEL.aggregate([
      {
        $match: {
          _id: { $ne: currentUser._id }
        }
      },
      {
        $lookup: {
          from: 'review-objects',
          localField: '_id',
          foreignField: 'user',
          as: 'review-objects'
        }
      },
      {
        $project: {
          'review-objects': 0,
          password: 0,
          token: 0,
          __v: 0
        }
      },
      {
        $sort: { totalDocumentsOwned: -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: perPage
      }
    ])

    // Fetch user profiles
    const userIds = users.map(user => user.userId)
    const userProfiles = await PROFILE_MODEL.find({ userId: { $in: userIds } })

    // Merge user profiles with user data
    users.forEach(user => {
      const userProfile = userProfiles.find(profile =>
        profile.userId.equals(user.userId)
      )
      user.property_profile = userProfile
    })

    const totalUserCount = await USER_MODEL.countDocuments({
      _id: { $ne: currentUser._id }
    })

    if (users.length === 0) {
      return res.status(404).json({
        profile_count: 0,
        current_page: page,
        next_page: null,
        page_count: 0,
        user_profiles: []
      })
    }

    const pageCount = Math.ceil(totalUserCount / perPage)
    const currentPageCount = users.length
    const hasMore = totalUserCount > skip + perPage
    let nextPage = null
    if (hasMore) {
      nextPage = page + 1
    }

    res.status(200).json({
      profile_count: totalUserCount,
      current_page: page,
      next_page: nextPage,
      page_count: pageCount,
      current_page_count: currentPageCount,
      user_profiles: users
    })
  } catch (error) {
    console.error('Error getting all users:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
export async function UpdateSubscriptionController (req, res) {
  try {
    const isSuperUser = await USER_MODEL.isSuperUser(
      req.locals.user.superUserToken
    )

    if (!isSuperUser) {
      return res.status(401).json({ error: 'Unauthorized - Action forbidden!' })
    }

    const userIdToUpdate = req.params.userId
    const user = await USER_MODEL.findOne({ userId: userIdToUpdate })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }
    user.isSubscribed = !user.isSubscribed
    await user.save()

    res.status(200).json({
      state: 'Success',
      message: 'Subscription status updated!',
      isSubscribed: user.isSubscribed
    })
  } catch (error) {
    console.error('Error updating subscription status:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
