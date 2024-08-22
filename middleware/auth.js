import jwt from 'jsonwebtoken'
import { config } from 'dotenv'
config()
const { MY_SECRET } = process.env
import { USER_MODEL } from '../src/models/user.js'
import { REVIEW } from '../src/models/documentModel.js'
import { logger } from '../src/utils/logger.js'

export const generateToken = payload => {
  const expiresIn = 60000
  return new Promise((resolve, reject) => {
    jwt.sign(payload, MY_SECRET, { expiresIn }, (err, token) => {
      if (err) reject(err)
      resolve(token)
    })
  })
}
export const generateJWTToken = async user => {
  const payload = {
    email: user.email,
    _id: user._id,
    version: user.version,
    isAdmin: user.isAdmin,
    isSuperUser: user.isSuperUser || false,
    superUserToken: user.isSuperUser ? user.superUserToken : null
  }
  return generateToken(payload)
}
export const loginUser = async (req, res, next) => {
  const {
    email = '',
    password = '',
    verification_token,
    isAdmin,
    superUserToken
  } = req.body

  try {
    const user = await USER_MODEL.findOne({ email })
    if (!user) {
      return res
        .status(401)
        .json({ error: 'Unauthorized. Signup to use this service.' })
    }

    if (verification_token) {
      try {
        if (verification_token !== user.password_reset_token) {
          return res.status(401).json({ error: 'Invalid verification token' })
        }

        user.password = password
        await user.save()

        user.password_reset_token = undefined
        await user.save()

        const token = await generateJWTToken(user)

        res.setHeader('authorization', `Bearer ${token}`)
        req.user = user.toObject()
        return res
          .status(200)
          .json({ message: 'Password updated successfully.' })
      } catch (error) {
        logger(error, 'error')
        return res
          .status(500)
          .json({ error: 'Error updating password', message: error.message })
      }
    }

    const isMatch = await user.comparePassword(password)

    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password' })
    }

    const userData = {
      email: user.email,
      _id: user._id,
      version: user.version,
      isAdmin: user.isAdmin,
      isSuperUser: user.isSuperUser || false
    }

    if (isAdmin) {
      userData.isAdmin = true
      if (superUserToken) {
        userData.isSuperUser = true
      }
    }

    req.locals = req.locals || {}

    const token = await generateJWTToken(user)

    res.setHeader('authorization', `Bearer ${token}`)
    if (user.superUserToken) {
      res.setHeader('admin-token', user.superUserToken)
      req.locals.superUserToken = user.superUserToken
    }

    req.user = user.toObject()
    next()
  } catch (error) {
    logger(error, 'error')
    res.status(500).json({ error: 'Server error', message: error.message })
  }
}
export const authMiddleware = async (req, res, next) => {
  const authHeader = req.headers['authorization']

  if (!authHeader) {
    return res
      .status(401)
      .json({ error: 'Authentication Failed: Missing required header(s)' })
  }

  const [bearer, token] = authHeader.split(' ')

  if (bearer !== 'Bearer' || !token) {
    return res.status(401).json({ error: 'Invalid Authorization header' })
  }

  try {
    const decodedToken = jwt.verify(token, MY_SECRET)
    const userEmail = decodedToken.email

    if (!userEmail) {
      return res.status(401).json({ error: 'Missing email in token data' })
    }

    const user = await USER_MODEL.findOne({ email: userEmail }).maxTimeMS(10000)

    if (!user) {
      return res.status(401).json({ error: 'Unauthorized action!' })
    }

    if (decodedToken.version !== user.version) {
      return res.status(401).json({ error: 'User has been deleted!' })
    }

    req.user = user
    req.token = token

    if (user.isAdmin) {
      req.locals = { user, isSuperUser: user.isSuperUser }
    } else {
      req.locals = { user }
    }

    next()
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' })
    }

    logger(`Authentication error: ${error}`, 'error')
    return res.status(401).json({ error: 'Authentication failed' })
  }
}
export const extractTokenMiddleware = (req, res, next) => {
  const authHeader = req.headers['authorization']
  if (authHeader) {
    const [bearer, token] = authHeader.split(' ')
    req.token = token
  }
  next()
}
export const checkDocumentAccess = async (req, res, next) => {
  try {
    const { user } = req.locals // retrieve user object from req.locals
    const document = await REVIEW.findById(req.params.id)

    if (!document) {
      return res.status(404).json({ error: 'Document not found' })
    }
    if (document.user.toString() !== user._id.toString() && !user.isAdmin) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    req.document = document
    next()
  } catch (error) {
    logger(error.message, 'error')
    res.status(500).json({ error: 'Server error', message: 'Try again later' })
  }
}
export const isAdmin = async (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({
      message: 'FORBIDDEN: Access denied!'
    })
  }
  next()
}
export const validateSuperUserToken = (userSysToken, requestToken) => {
  try {
    return !!userSysToken && userSysToken === requestToken
  } catch (error) {
    logger(`Error validating super user token: ${error}`, 'error')
    return false
  }
}
