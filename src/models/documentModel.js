import mongoose from 'mongoose'
import { generateUniqueId } from '../../middleware/uuidGenerator.js'
import { logger } from '../loggers/logger.js'
import { PROFILE_MODEL } from './profileModel.js'

const ReviewModel = {
  uuid: { type: String, default: null, index: true },
  reviewSiteSlug: { type: String, required: true, index: true },
  siteId: { type: String, required: true },
  reviewPageId: { type: String, default: null },
  urlAgent: { type: String, required: true },
  originalEndpoint: { type: String, default: null },
  author: { type: String, default: 'Anonymous', index: true },
  country: { type: String, default: null, index: true },
  authorExternalId: { type: String, default: null },
  authorLocation: { type: String, default: null },
  authorReviewCount: { type: String, default: null },
  authorProfileUrl: { type: String, default: null },
  miscellaneous: { type: mongoose.Schema.Types.Mixed, default: null },
  reviewBody: { type: String, default: 'no text provided', index: true },
  propertyResponse: {
    body: { type: String, default: null },
    responseDate: { type: String, default: null },
    author: { type: String, default: null }
  },
  hasPropertyResponse: { type: Boolean, default: false },
  brandCheck: { type: String, default: null },
  brandType: { type: String, default: null },
  isFullRun: { type: Boolean, default: false },
  isInitialRun: { type: Boolean, default: true },
  isApproved: { type: Boolean, default: true },
  language: { type: String, default: '' },
  internalId: {
    type: String,
    default: function () {
      return generateUniqueId(10)
    }
  },
  propertyProfileUrl: { type: String },
  propertyName: { type: String, default: null },
  rating: { type: String, required: true },
  recommends: { type: String, default: null },
  externallId: { type: String, default: null },
  replyUrl: { type: String, default: null },
  reviewDate: { type: String, required: true, index: true },
  stayDate: { type: String, default: null, index: true },
  checkInDate: { type: String, default: null, index: true },
  checkOutDate: { type: String, default: null },
  title: { type: String, default: null },
  stayStatus: { type: String, default: 'stayed' },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'UserId',
    required: true,
    index: true
  },
  tripType: { type: String, default: null, index: true },
  subratings: [
    {
      key: { type: String, required: true },
      value: { type: String, required: true }
    }
  ]
}

const REVIEW_MODEL = new mongoose.Schema(ReviewModel, { timestamps: true })
REVIEW_MODEL.index(
  {
    author: 1,
    reviewDate: 1,
    userId: 1,
    stayDate: 1,
    checkInDate: 1,
    tripType: 1,
    brandCheck: 1,
    country: 1,
    reviewBody: 1,
    reviewSiteSlug: 1,
    uuid: 1
  },
  { sparse: true }
)
REVIEW_MODEL.statics.validateDocumentOwnership = async function (
  req,
  res,
  next
) {
  try {
    const { userId, isAdmin } = req.user
    if (!isAdmin) return res.status(401).json({ error: 'Unauthorized' })

    const documents = await this.find({ userId }, { data: 0 }).exec()
    if (documents.length === 0) {
      return res.status(404).json({ error: 'Documents not found' })
    }

    const userDocuments = documents.find(
      doc => doc.userId?.toString() === userId?.toString()
    )
    if (!userDocuments) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    req.locals = { userDocuments }
    next()
  } catch (error) {
    logger.error('Error in validateDocumentOwnership:', error)
    return res.status(500).json({ error: 'Server error' })
  }
}
// Check if user owns the document
REVIEW_MODEL.statics.isDocumentOwner = async function (req) {
  try {
    const userId = req.locals.user.userId
    const documentId = req.params.documentId

    const reviewDoc = await this.findOne({ _id: documentId, userId })
    return reviewDoc !== null
  } catch (error) {
    logger.error(`Error in isDocumentOwner: ${error}`)
    return false
  }
}
REVIEW_MODEL.pre('save', async function (next) {
  const rating = parseFloat(this.rating)
  if (!isNaN(rating) && rating > 5) {
    this.rating = Math.round((rating / 10) * 5)
  }

  const siteProfile = await PROFILE_MODEL.findOne({
    userId: this.userId,
    reviewSiteSlug: this.reviewSiteSlug
  })
  if (siteProfile) this.uuid = siteProfile._id

  if (
    this.propertyResponse &&
    typeof this.propertyResponse.body === 'string' &&
    this.propertyResponse.body.trim()
  ) {
    this.hasPropertyResponse = true
  } else {
    this.hasPropertyResponse = false
    this.propertyResponse = null
  }

  next()
})
REVIEW_MODEL.statics.convertReviewDateToTimestamp = function (reviewDate) {
  const dateObject = new Date(reviewDate)
  if (isNaN(dateObject.getTime())) {
    throw new Error('Invalid date format')
  }
  return dateObject.getTime()
}
const REVIEW = mongoose.model('review-objects', REVIEW_MODEL)
export { REVIEW }
