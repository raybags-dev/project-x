import {
  deleteReviewsByProfileFromS3,
  deleteReviewsFromS3,
  saveObjectToS3
} from '../../src/blobStorage/aws/s3BucketUtility.js'

import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'

import { logger } from '../../src/loggers/logger.js'

jest.mock('../../src/loggers/logger.js', () => ({
  logger: jest.fn()
}))

let mockSend

beforeEach(() => {
  mockSend = jest.fn()
  jest.spyOn(S3Client.prototype, 'send').mockImplementation(mockSend)
  jest.clearAllMocks()
})

afterEach(() => {
  jest.restoreAllMocks()
})

describe('S3 Utilities', () => {
  const sampleReview = {
    userId: '12345',
    reviewSiteSlug: 'tripadvisor',
    authorExternalId: 'abcde',
    content: 'Some review'
  }

  describe('saveObjectToS3', () => {
    it('should call PutObjectCommand for each valid review', async () => {
      mockSend.mockResolvedValue({})

      await saveObjectToS3([sampleReview], true)

      expect(mockSend).toHaveBeenCalledWith(expect.any(PutObjectCommand))
      expect(logger).toHaveBeenCalledWith('Saved 1 reviews to S3', 'info')
    })
  })

  describe('deleteReviewsFromS3', () => {
    it('should send DeleteObjectCommand for each review', async () => {
      mockSend.mockResolvedValue({})

      await deleteReviewsFromS3([sampleReview])

      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectCommand))
      expect(logger).toHaveBeenCalledWith(
        expect.stringContaining('Object removed from S3:'),
        'info'
      )
    })
  })

  describe('deleteReviewsByProfileFromS3', () => {
    it('should skip deletion if no objects found', async () => {
      mockSend.mockResolvedValueOnce({ Contents: [] }) // ListObjectsV2Command

      await deleteReviewsByProfileFromS3({
        userId: '12345',
        reviewSiteSlug: 'tripadvisor'
      })

      expect(mockSend).toHaveBeenCalledWith(expect.any(ListObjectsV2Command))
      expect(mockSend).toHaveBeenCalledTimes(1) // Only List
    })

    it('should delete listed objects when found', async () => {
      mockSend
        .mockResolvedValueOnce({
          Contents: [{ Key: 'reviews/12345_tripadvisor_abcde.json' }]
        }) // List
        .mockResolvedValueOnce({}) // DeleteObjects

      await deleteReviewsByProfileFromS3({
        userId: '12345',
        reviewSiteSlug: 'tripadvisor'
      })

      expect(mockSend).toHaveBeenCalledWith(expect.any(ListObjectsV2Command))
      expect(mockSend).toHaveBeenCalledWith(expect.any(DeleteObjectsCommand))
      expect(logger).toHaveBeenCalledWith(
        expect.stringContaining('Deleted 1 reviews from S3'),
        'info'
      )
    })
  })
})
