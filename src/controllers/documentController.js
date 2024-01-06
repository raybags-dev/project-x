import { USER_MODEL, USER_ID_MODEL } from '../models/user.js'
import fs from 'fs'
import path from 'path'

import { PROFILE_MODEL } from '../models/profileModel.js'
import { sendEmail } from '../../middleware/emailer.js'
import { REVIEW } from '../models/documentModel.js'
import { token } from 'morgan'

const currentModuleURL = new URL(import.meta.url)
const currentModuleDir = path.dirname(currentModuleURL.pathname)
const SLUGS_FILE_PATH = path.join(
  currentModuleDir,
  '..',
  '_data_/data/slugs.txt'
)

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

      // Allow access if the user is the owner or a superuser
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
    console.error(error)
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
      console.log(error.message)
      const statusCode = 400
      return res.status(statusCode).json({
        status: 'mongo-error',
        message: 'Invalid document ID format'
      })
    }

    console.error(error.message)
    res.status(500).json({ error: 'Server error', message: error.message })
  }
}
export async function AllUserDocsController (req, res) {
  try {
    const { isAdmin, userId, isSuperUser } = req.user

    const requestedSlug = (req.query.slug || '').toLowerCase()
    if (!requestedSlug) {
      return res
        .status(400)
        .json('Query string for review site (slug) is required!')
    }

    const profile = await PROFILE_MODEL.findOne({ userId })

    if (!profile)
      return res.status(404).json('profile not found or has been deleted!')

    const { reviewSiteSlug, internalId, uuid, computedUrl, name } = profile

    const siteSlugs = fs
      .readFileSync(SLUGS_FILE_PATH, 'utf8')
      .split(',')
      .map(slug => slug.trim())

    if (!siteSlugs.includes(requestedSlug)) {
      return res
        .status(400)
        .json('Invalid site name or currently unsupported site slug!')
    }

    if (reviewSiteSlug !== requestedSlug) {
      return res.status(400).json('Requested site does not match any profile.')
    }

    await REVIEW.validateDocumentOwnership(req, res, async () => {
      try {
        let query, count

        let page = parseInt(req.query.page) || 1
        const perPage = 20
        const skip = (page - 1) * perPage

        if (isSuperUser) {
          query = REVIEW.find({ token, siteId: internalId })
            .sort({ reviewDate: -1, createdAt: 1 })
            .skip(skip)
            .limit(perPage)

          count = await REVIEW.countDocuments({})
        } else {
          query = REVIEW.find({ userId: userId })
            .sort({ reviewDate: -1, createdAt: 1 })
            .skip(skip)
            .limit(perPage)

          count = await REVIEW.countDocuments({ userId: userId })
        }

        const response = await query
        if (response.length === 0) return res.status(404).json('Nothing found!')

        const totalPageCount = Math.ceil(count / perPage)
        const currentPage = page
        const previousPage = page > 1 ? page - 1 : null
        const nextPage = page < totalPageCount ? page + 1 : null

        res.status(200).json({
          uuid: uuid,
          reviewSiteSlug: reviewSiteSlug,
          url: computedUrl,
          documentCountTotal: count,
          totalPageCount: totalPageCount,
          currentPage: currentPage,
          previousPage: previousPage,
          nextPage: nextPage,
          data: response,
          propertyName: name,
          requestTimestamp: new Date()
        })
      } catch (error) {
        console.log('Error from AllUserDocsRouter: ', error.message)
      }
    })
  } catch (error) {
    console.error('Error in AllUserDocsRouter:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
}
