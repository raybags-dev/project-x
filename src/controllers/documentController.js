import dateFns from 'date-fns'
import mongoose from 'mongoose'
import { logger } from '../loggers/logger.js'
import { REVIEW } from '../models/documentModel.js'
import { PROFILE_MODEL } from '../models/profileModel.js'
import { USER_MODEL } from '../models/user.js'

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
export async function DeleteAllUserProfileDocumentsController (req, res) {
  try {
    const { userId: requestUserId } = req.params
    const reviewSiteSlug = (req.query.slug || '').toLowerCase()

    if (!requestUserId || !reviewSiteSlug) {
      return res.status(400).json({
        status: 'failed',
        message: 'Missing required parameters: userId or slug'
      })
    }

    const localUser = req.locals.user

    if (requestUserId !== localUser.userId.toString()) {
      return res.status(403).json({
        status: 'FORBIDDEN',
        message: 'You are not authorized'
      })
    }

    const userProfile = await PROFILE_MODEL.findOne({
      userId: new mongoose.Types.ObjectId(requestUserId),
      reviewSiteSlug
    }).lean()

    if (!userProfile) {
      return res.status(404).json({
        status: 'failed',
        message: 'No matching user profile found for the provided slug'
      })
    }

    const deleteResult = await REVIEW.deleteMany({
      userId: new mongoose.Types.ObjectId(userProfile.userId),
      reviewSiteSlug
    })

    if (deleteResult.deletedCount === 0) {
      return res.status(404).json({
        status: 'failed',
        message: 'No matching documents found to delete'
      })
    }

    return res.status(200).json({
      status: 'success',
      count: deleteResult.deletedCount,
      message: `Successfully deleted ${deleteResult.deletedCount} documents`
    })
  } catch (error) {
    switch (error.name) {
      case 'CastError':
      case 'ObjectId':
        return res.status(400).json({
          status: 'mongo-error',
          message: 'Invalid userId format'
        })
      default:
        console.error('Error deleting documents:', error)
        return res.status(500).json({
          status: 'server-error',
          message: 'An internal server error occurred'
        })
    }
  }
}
export async function AllUserDocsController (req, res) {
  try {
    const localUser = req.locals.user
    const userId = localUser.userId
    const requestedSlug = (req.query.slug || '').toLowerCase()
    const brandtype = req.query.brandtype

    let query, count

    let page = parseInt(req.query.page) || 1
    const perPage = 20
    const skip = (page - 1) * perPage

    const queryConditions = { userId }

    if (brandtype) {
      queryConditions.brandCheck = brandtype
    }

    if (requestedSlug) {
      queryConditions.reviewSiteSlug = requestedSlug
    }

    if (!requestedSlug) {
      query = REVIEW.find(queryConditions)
        .sort({ reviewDate: -1, createdAt: 1 })
        .skip(skip)
        .limit(perPage)

      count = await REVIEW.countDocuments(queryConditions)
    } else {
      const profile = await PROFILE_MODEL.findOne({
        userId,
        reviewSiteSlug: requestedSlug
      })
      if (!profile) {
        return res.status(404).json('Profile not found or has been deleted!')
      }

      query = REVIEW.find(queryConditions)
        .sort({ reviewDate: -1, createdAt: 1 })
        .skip(skip)
        .limit(perPage)

      count = await REVIEW.countDocuments(queryConditions)
    }

    const response = await query
    if (response.length === 0) return res.status(404).json('Nothing found!')

    const totalPageCount = Math.ceil(count / perPage)
    const currentPage = page
    const previousPage = page > 1 ? page - 1 : null
    const nextPage = page < totalPageCount ? page + 1 : null

    const responseObject = {
      documentCountTotal: count,
      totalPageCount,
      currentPage,
      previousPage,
      nextPage,
      data: response,
      propertyName: localUser.name,
      requestTimestamp: new Date()
    }

    if (requestedSlug) {
      const profile = await PROFILE_MODEL.findOne({
        userId,
        reviewSiteSlug: requestedSlug
      })
      responseObject.uuid = profile.uuid
      responseObject.reviewSiteSlug = profile.reviewSiteSlug
      responseObject.url = profile.computedUrl || profile.originalUrl
    }

    res.status(200).json(responseObject)
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
export async function searchReviews (req, res) {
  try {
    const requestUserId = req.params.id
    const localUser = req.locals.user
    const userId = localUser.userId.toString()

    if (requestUserId !== userId) {
      return res.status(403).json({
        status: 'FORBIDDEN',
        message: 'You are not authorized'
      })
    }

    const {
      q,
      range_filter_field,
      range_filter_from,
      range_filter_to,
      sort_field = 'created_at',
      page = 1,
      limit = 20
    } = req.query

    // Build query filter
    const filter = { userId: userId }

    if (q && q.trim() !== '') {
      const searchRegex = new RegExp(q.trim(), 'i')
      filter.$or = [{ author: searchRegex }, { title: searchRegex }]
    }

    if (range_filter_field && range_filter_from && range_filter_to) {
      const fromDate = new Date(range_filter_from)
      const toDate = new Date(range_filter_to)

      toDate.setDate(toDate.getDate() + 1)
      const dateFieldMap = {
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        date_review: 'reviewDate'
      }

      const fieldToFilter = dateFieldMap[range_filter_field]

      if (fieldToFilter) {
        if (fieldToFilter === 'reviewDate') {
          const fromISO = fromDate.toISOString().split('T')[0]
          const toISO = toDate.toISOString().split('T')[0]

          filter.$or = [
            { reviewDate: { $gte: fromDate, $lt: toDate } },
            { reviewDate: { $gte: fromISO, $lt: toISO } }
          ]
        } else {
          filter[fieldToFilter] = { $gte: fromDate, $lt: toDate }
        }
      }
    }

    // Calculate pagination values
    const skip = (parseInt(page) - 1) * parseInt(limit)

    const sortConfig = {}
    if (sort_field) {
      const sortFieldMap = {
        created_at: 'createdAt',
        updated_at: 'updatedAt',
        date_review: 'reviewDate'
      }
      sortConfig[sortFieldMap[sort_field] || sort_field] = -1
    }

    // Execute query with pagination
    const reviews = await REVIEW.find(filter)
      .sort(sortConfig)
      .skip(skip)
      .limit(parseInt(limit))
      .lean()

    // Get total count for pagination
    const totalReviews = await REVIEW.countDocuments(filter)
    const totalPages = Math.ceil(totalReviews / parseInt(limit))

    return res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          total: totalReviews,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages
        },
        query: {
          q,
          range_filter_field,
          range_filter_from,
          range_filter_to,
          sort_field
        }
      }
    })
  } catch (error) {
    logger(
      `Error in searchReviews: ${error.message}, ${JSON.stringify({
        stack: error.stack
      })}`,
      'error'
    )
    return res.status(500).json({
      success: false,
      message: 'An error occurred while searching reviews',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    })
  }
}
