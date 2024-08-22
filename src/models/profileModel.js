import mongoose from 'mongoose'
import { USER_MODEL } from './user.js'
import {
  generateUUID,
  generateUniqueId
} from '../../middleware/uuidGenerator.js'
import { logger } from '../../src/utils/logger.js'

const reviewSiteProfileModel = {
  uuid: {
    type: String,
    required: true,
    unique: true,
    default: generateUUID
  },
  reviewSiteSlug: {
    type: String,
    required: true
  },
  internalId: {
    type: String,
    default: function () {
      return generateUniqueId(6)
    }
  },
  url: {
    type: String,
    required: true
  },
  propertyEndpoints: {
    type: Object,
    default: {}
  },
  originalUrl: {
    type: String,
    required: true
  },
  createdTimestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  reviewPageUrl: {
    type: String,
    default: null
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserId',
    required: true
  },
  propertyReviewCount: {
    type: Number,
    default: null
  },
  propertyExternalId: {
    type: Number,
    default: null
  },
  computedUrl: {
    type: String,
    required: true
  },
  propertyType: {
    type: String,
    default: 'HOTEL'
  },
  nextRunType: {
    type: String,
    default: 'REGULAR'
  },
  name: {
    type: String,
    required: true
  }
}

const reviewSiteProfileSchema = new mongoose.Schema(reviewSiteProfileModel, {
  timestamps: true
})
reviewSiteProfileSchema.statics.nextRunType = async function (req, res) {
  try {
    const userId = req.locals.user.userId
    const profile = await this.findOne({ userId })

    return profile ? profile.nextRunType : 'REGULAR'
  } catch (error) {
    logger(`Error fetching nextRunType: ${error.message}`, 'error')
    return 'REGULAR'
  }
}
reviewSiteProfileSchema.index(
  {
    'response.reviewSiteSlug': 'text',
    'response.internalId': 'text',
    uuid: 'text',
    internalId: 'text',
    url: 'text'
  },
  { default_language: 'simple', caseInsensitive: true }
)

reviewSiteProfileSchema.pre('save', async function (next) {
  try {
    await USER_MODEL.updateOne(
      { userId: this.userId },
      { $set: { hasReviewProfile: true } }
    )

    // Update profiles field in User model
    const {
      _id: profileId,
      name: propertyName,
      reviewSiteSlug,
      url,
      originalUrl,
      propertyType,
      uuid,
      propertyEndpoints
    } = this

    const userProfile = {
      _id: profileId,
      name: propertyName,
      slug: reviewSiteSlug,
      url,
      originalUrl,
      propertyType,
      uuid,
      propertyEndpoints
    }

    if (this.isNew) {
      await USER_MODEL.updateOne(
        { userId: this.userId },
        { $push: { profiles: userProfile } }
      )
    } else {
      await USER_MODEL.findOneAndUpdate(
        { userId: this.userId },
        { $set: { profiles: [userProfile] } }
      )
    }

    next()
  } catch (error) {
    logger(`Error in profile pre-save hook: ${error}`, 'error')
    next(error)
  }
})

reviewSiteProfileSchema.methods.beforeDelete = async function () {
  try {
    logger('its working....', 'info')
    await USER_MODEL.updateOne(
      { userId: this.userId },
      { $set: { hasReviewProfile: false } }
    )
  } catch (error) {
    logger(
      `Error in custom beforeDelete method on reviewSiteProfileSchema: ${error.message}`,
      'error'
    )
  }
}
const PROFILE_MODEL = mongoose.model('site-profiles', reviewSiteProfileSchema)
export { PROFILE_MODEL }
