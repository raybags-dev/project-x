// const mongoose = require('mongoose')
// const ObjectId = mongoose.Types.ObjectId
import * as s3Utils from '../../src/blobStorage/aws/s3BucketUtility.js'
import * as controllerFuncs from '../../src/controllers/documentController.js'
import { logger } from '../../src/loggers/logger.js'
import { REVIEW } from '../../src/models/documentModel.js'
import { USER_MODEL } from '../../src/models/user.js'

// Mock dependencies
jest.mock('../../src/models/documentModel.js')
jest.mock('../../src/models/user.js')
jest.mock('../../src/loggers/logger.js')
jest.mock('../../src/models/profileModel.js')
jest.mock('../../src/blobStorage/aws/s3BucketUtility.js', () => ({
  deleteReviewsFromS3: jest.fn(),
  deleteReviewsByProfileFromS3: jest.fn()
}))

describe('FindOneDocController', () => {
  let req, res

  beforeEach(() => {
    jest.clearAllMocks()

    req = {
      params: { documentId: 'valid-doc-id' },
      locals: { user: { userId: 'user-123', superUserToken: 'token-123' } }
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    REVIEW.isDocumentOwner = jest.fn().mockResolvedValue(true)
    REVIEW.findOne = jest.fn().mockResolvedValue({
      _id: 'valid-doc-id',
      userId: 'user-123'
    })
    USER_MODEL.isSuperUser = jest.fn().mockResolvedValue(false)
  })

  test('returns document when user is owner', async () => {
    const mockDoc = { _id: 'valid-doc-id', userId: 'user-123' }
    REVIEW.findOne.mockResolvedValue(mockDoc)

    await controllerFuncs.FindOneDocController(req, res)

    expect(REVIEW.findOne).toHaveBeenCalledWith({ _id: 'valid-doc-id' })
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Success',
      document: mockDoc
    })
  })

  test('returns document when user is superuser', async () => {
    REVIEW.isDocumentOwner.mockResolvedValue(false)
    USER_MODEL.isSuperUser.mockResolvedValue(true)
    const mockDoc = { _id: 'valid-doc-id', userId: 'other-user' }
    REVIEW.findOne.mockResolvedValue(mockDoc)

    await controllerFuncs.FindOneDocController(req, res)

    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Success',
      document: mockDoc
    })
  })

  test('returns 403 when user is not owner and not superuser', async () => {
    REVIEW.isDocumentOwner.mockResolvedValue(false)
    USER_MODEL.isSuperUser.mockResolvedValue(false)

    await controllerFuncs.FindOneDocController(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Document could not be found'
    })
  })

  test('returns 404 when document not found', async () => {
    REVIEW.findOne.mockResolvedValue(null)

    await controllerFuncs.FindOneDocController(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      status: 'failed',
      message: 'Document not found!'
    })
  })

  test('returns 400 for invalid document ID format', async () => {
    // Mock the invalid ObjectId format
    req.params.documentId = 'invalid-id'

    // Mock the database to throw an error (simulate invalid ObjectId format)
    REVIEW.findOne = jest.fn().mockRejectedValue({
      message: 'Argument passed in must be a string of 12 bytes'
    })

    // Call the controller function
    await controllerFuncs.FindOneDocController(req, res)

    // Assert that the status and error message are correct
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Invalid document ID format'
    })
  })

  test('returns 500 on server error', async () => {
    REVIEW.isDocumentOwner.mockRejectedValue(new Error('Database error'))

    await controllerFuncs.FindOneDocController(req, res)

    expect(logger).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error'
    })
  })
})

describe('DeleteOneDocumentController', () => {
  let req, res, mockDocument

  beforeEach(() => {
    jest.clearAllMocks()

    mockDocument = {
      _id: 'valid-doc-id',
      userId: 'user-123',
      delete: jest.fn().mockResolvedValue(true)
    }

    req = {
      params: { documentId: 'valid-doc-id' },
      locals: { user: { userId: 'user-123' } }
    }

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    }

    REVIEW.findOne = jest.fn().mockResolvedValue(mockDocument)
    REVIEW.isDocumentOwner = jest.fn().mockResolvedValue(true)
    s3Utils.deleteReviewsFromS3.mockResolvedValue()
  })

  test('successfully deletes a document', async () => {
    await controllerFuncs.DeleteOneDocumentController(req, res)

    expect(REVIEW.findOne).toHaveBeenCalledWith({
      _id: 'valid-doc-id',
      userId: 'user-123'
    })
    expect(REVIEW.isDocumentOwner).toHaveBeenCalledWith(req)
    expect(s3Utils.deleteReviewsFromS3).toHaveBeenCalledWith(mockDocument)
    expect(mockDocument.delete).toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(200)
    expect(res.json).toHaveBeenCalledWith({
      message: 'Success',
      confirmation: 'Document with ID valid-doc-id deleted successfully.'
    })
  })

  test('returns 404 when document not found', async () => {
    REVIEW.findOne.mockResolvedValue(null)

    await controllerFuncs.DeleteOneDocumentController(req, res)

    expect(res.status).toHaveBeenCalledWith(404)
    expect(res.json).toHaveBeenCalledWith({
      status: 'failed',
      message: 'Document not found!'
    })
    expect(s3Utils.deleteReviewsFromS3).not.toHaveBeenCalled()
  })

  test('returns 403 when user is not the document owner', async () => {
    REVIEW.isDocumentOwner.mockResolvedValue(false)

    await controllerFuncs.DeleteOneDocumentController(req, res)

    expect(res.status).toHaveBeenCalledWith(403)
    expect(res.json).toHaveBeenCalledWith({
      status: 'FORBIDDEN',
      message: 'You are not authorized to delete this document!'
    })
    expect(s3Utils.deleteReviewsFromS3).not.toHaveBeenCalled()
    expect(mockDocument.delete).not.toHaveBeenCalled()
  })

  test('returns 400 for invalid document ID', async () => {
    const castError = new Error('Invalid ObjectId')
    castError.name = 'CastError'
    REVIEW.findOne.mockRejectedValue(castError)

    await controllerFuncs.DeleteOneDocumentController(req, res)

    expect(logger).toHaveBeenCalledWith('Invalid ObjectId', 'warn')
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({
      status: 'mongo-error',
      message: 'Invalid document ID format'
    })
  })

  test('returns 500 on server error', async () => {
    const serverError = new Error('Database connection error')
    REVIEW.findOne.mockRejectedValue(serverError)

    await controllerFuncs.DeleteOneDocumentController(req, res)

    expect(logger).toHaveBeenCalledWith('Database connection error', 'error')
    expect(res.status).toHaveBeenCalledWith(500)
    expect(res.json).toHaveBeenCalledWith({
      error: 'Server error',
      message: 'Database connection error'
    })
  })
})
