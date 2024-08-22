import { USER_MODEL } from '../models/user.js'
import mongoose from 'mongoose'
import dateFns from 'date-fns'
import { ObjectId } from 'mongodb'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { sendEmail } from '../../middleware/emailer.js'
import { REVIEW } from '../models/documentModel.js'
import { logger } from '../utils/logger.js'

export async function FindOneDocController (req, res) {
  try {
    const userId = req.locals.user.userId
    const itemId = req.params.documentId

    const isSuperUser = await USER_MODEL.isSuperUser(
      req.locals.user.superUserToken
    )

    // If the user is not the owner and not a superuser, deny access
    if (!(await REVIEW.isDocumentOwner(req)) && !isSuperUser) {
      return res.status(403).json({
        message: 'Document could not be found'
      })
    }

    try {
      const document = await REVIEW.findOne({ _id: itemId })

      if (!document) {
        return res
          .status(404)
          .json({ status: 'failed', message: 'Document not found!' })
      }

      if (document.userId.toString() === userId.toString() || isSuperUser) {
        return res.status(200).json({ message: 'Success', document })
      }

      res.status(403).json({ message: 'Access denied' })
    } catch (error) {
      if (
        error.message.includes(
          'Argument passed in must be a string of 12 bytes'
        )
      ) {
        return res.status(400).json({ error: 'Invalid document ID format' })
      }
      throw error
    }
  } catch (error) {
    logger(error, 'error')
    res.status(500).json({ error: 'Server error' })
  }
}
export async function DeleteOneDocumentController (req, res) {
  try {
    const itemId = req.params.documentId
    const userId = req.locals.user.userId

    const document = await REVIEW.findOne({ _id: itemId, userId })

    if (!document) {
      return res.status(404).json({
        status: 'failed',
        message: 'Document not found!'
      })
    }

    const isOwner = await REVIEW.isDocumentOwner(req)
    if (!isOwner) {
      return res.status(403).json({
        status: 'FORBIDDEN',
        message: 'You are not authorized to delete this document!'
      })
    }

    await document.delete()

    res.status(200).json({
      message: 'Success',
      confirmation: `Document with ID ${itemId} deleted successfully.`
    })
  } catch (error) {
    if (error.name === 'CastError' || error.name === 'ObjectId') {
      logger(error.message, 'warn')
      const statusCode = 400
      return res.status(statusCode).json({
        status: 'mongo-error',
        message: 'Invalid document ID format'
      })
    }

    logger(error.message, 'error')
    res.status(500).json({ error: 'Server error', message: error.message })
  }
}
export async function AllUserDocsController (req, res) {
  try {
    const { userId } = req.locals.user

    const profile = await PROFILE_MODEL.findOne({ userId })
    if (!profile) {
      return res.status(404).json('Profile not found or has been deleted!')
    }

    const { reviewSiteSlug, internalId, uuid, computedUrl, name, originalUrl } =
      profile

    const requestedSlug = (req.query.slug || '').toLowerCase()

    let query, count

    let page = parseInt(req.query.page) || 1
    const perPage = 20
    const skip = (page - 1) * perPage

    if (!requestedSlug || requestedSlug == undefined) {
      query = REVIEW.find({ userId })
        .sort({ reviewDate: -1, createdAt: 1 })
        .skip(skip)
        .limit(perPage)

      count = await REVIEW.countDocuments({ userId })
    } else {
      query = REVIEW.find({ userId, reviewSiteSlug: requestedSlug })
        .sort({ reviewDate: -1, createdAt: 1 })
        .skip(skip)
        .limit(perPage)

      count = await REVIEW.countDocuments({
        userId,
        reviewSiteSlug: requestedSlug
      })
    }

    const response = await query
    if (response.length === 0) return res.status(404).json('Nothing found!')

    const totalPageCount = Math.ceil(count / perPage)
    const currentPage = page
    const previousPage = page > 1 ? page - 1 : null
    const nextPage = page < totalPageCount ? page + 1 : null

    res.status(200).json({
      uuid,
      reviewSiteSlug,
      url: computedUrl || originalUrl,
      documentCountTotal: count,
      totalPageCount,
      currentPage,
      previousPage,
      nextPage,
      data: response,
      propertyName: name,
      requestTimestamp: new Date()
    })
  } catch (error) {
    logger(`Error in AllUserDocsRouter: ${error}`, 'error')
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
export async function SearchDocumentsController (req, res) {
  try {
    const requestingUser = req.params.id
    const query = req.query.q
    const qValue = req.query.qValue

    if (!query || !qValue) {
      return res
        .status(400)
        .json({ error: 'Both query (q) and qValue parameters are required.' })
    }

    const user = await USER_MODEL.findOne({ _id: requestingUser })
    if (!user) {
      return res.status(404).json({ error: 'User making request not found' })
    }

    const ownerReviewsUUIDs = user.profiles.map(profile => profile._id)

    if (req.query.hasOwnProperty('dateValue')) {
      const dateRange = req.query.dateValue
      const timeZone = 'Europe/Berlin'
      const [startDateString, endDateString] = dateRange.split(' to ')

      try {
        const startDate = dateFns.parse(
          startDateString,
          'yyyy-MM-dd',
          new Date()
        )
        const formattedStartDate = dateFns.format(
          startDate,
          'yyyy-MM-dd',
          timeZone
        )
        const endDate = dateFns.parse(endDateString, 'yyyy-MM-dd', new Date())
        const formattedEndDate = dateFns.format(endDate, 'yyyy-MM-dd', timeZone)

        if (!isNaN(startDate) && !isNaN(endDate)) {
          const documents = await REVIEW.find({
            uuid: { $in: ownerReviewsUUIDs },
            checkInDate: {
              $gte: formattedStartDate,
              $lte: formattedEndDate
            }
          })
            .sort({ [query]: qValue ? 1 : -1 })
            .exec()

          if (!documents || documents.length === 0) {
            return res.status(404).json('Nothing found!')
          }
          logger(documents.length, 'info')
          return res.status(200).json({ count: documents.length, documents })
        }
      } catch (error) {
        logger(`Error parsing dates: ${error}`, 'error')
      }
    }

    return res.status(400).json({ error: 'Invalid date range' })
  } catch (error) {
    logger(`Error in SearchDocumentsController: ${error}`, 'error')
    return res.status(500).json({ error: 'Server error' })
  }
}
