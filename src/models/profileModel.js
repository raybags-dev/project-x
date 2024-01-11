import mongoose from 'mongoose'
import { USER_MODEL } from './user.js'
import {
  generateUUID,
  generateUniqueId
} from '../../middleware/uuidGenerator.js'

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
    console.error('Error fetching nextRunType:', error.message)
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
    // Update hasReviewProfile field
    await USER_MODEL.updateOne(
      { userId: this.userId },
      { $set: { hasReviewProfile: true } }
    )
    // Update profiles field in User model
    if (this.isNew) {
      const { _id: profileId, name: propertyName, slug, url } = this

      await USER_MODEL.updateOne(
        { userId: this.userId },
        {
          $push: {
            profiles: {
              _id: profileId,
              name: propertyName,
              slug,
              url
            }
          }
        }
      )
    }

    next()
  } catch (error) {
    console.error('Error in profile pre-save hook:', error)
    next(error)
  }
})

reviewSiteProfileSchema.methods.beforeDelete = async function () {
  try {
    console.log('its working....')
    await USER_MODEL.updateOne(
      { userId: this.userId },
      { $set: { hasReviewProfile: false } }
    )
  } catch (error) {
    console.error(
      'Error in custom beforeDelete method on reviewSiteProfileSchema: ',
      error.message
    )
  }
}
const PROFILE_MODEL = mongoose.model('site-profiles', reviewSiteProfileSchema)
export { PROFILE_MODEL }
