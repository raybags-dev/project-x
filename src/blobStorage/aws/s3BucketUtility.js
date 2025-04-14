import {
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client
} from '@aws-sdk/client-s3'
import 'dotenv/config'
import { logger } from '../../loggers/logger.js'

const {
  AWS_BUCKET_NAME,
  AWS_REGION,
  AWS_SECRET_ACCESS_KEY,
  AWS_ACCESS_KEY_ID
} = process.env

const s3Client = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
})
const sanitize = value => {
  return String(value)
    .trim()
    .replace(/\s+/g, '_')
    .replace(/[^a-zA-Z0-9_-]/g, '')
}
const generateReviewFileName = review => {
  const { reviewSiteSlug, authorExternalId, userId } = review
  return `${sanitize(userId)}_${sanitize(reviewSiteSlug)}_${sanitize(
    authorExternalId
  )}.json`
}
const isValidReviewData = review => {
  if (!review) {
    logger('No review data provided', 'error')
    return false
  }

  if (typeof review !== 'object' || Array.isArray(review)) {
    logger('Invalid review data format', 'error')
    return false
  }

  if (Object.keys(review).length === 0) {
    logger('Review data is empty', 'error')
    return false
  }

  return true
}
async function saveReviewToS3 (review, save_to_s3 = true) {
  if (!save_to_s3) {
    logger('Saving to S3 is disabled', 'warn')
    return null
  }

  if (!isValidReviewData(review)) {
    logger('Invalid review object', 'warn')
    return null
  }

  try {
    // Generate a unique filename
    const fileName = generateReviewFileName(review)
    const reviewKey = `reviews/${fileName}`
    const bucketName = AWS_BUCKET_NAME

    const reviewData = JSON.stringify(review, null, 2)

    // Save the review (this will overwrite if it already exists)
    await s3Client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: reviewKey,
        Body: reviewData,
        ContentType: 'application/json'
      })
    )

    logger(`Saved review to S3: ${reviewKey}`, 'info')
    return reviewKey
  } catch (error) {
    logger(`Error saving review to S3: ${error.message}`, 'error')
    return null
  }
}
export async function saveObjectToS3 (reviews) {
  if (!Array.isArray(reviews) || reviews.length === 0) return
  try {
    await Promise.all(reviews.map(review => saveReviewToS3(review, true)))
    logger(`Saved ${reviews.length} reviews to S3`, 'info')
  } catch (error) {
    logger(`Error saving reviews to S3: ${error.message}`, 'error')
  }
}
export async function deleteReviewsFromS3 (reviews) {
  if (!reviews || (Array.isArray(reviews) && reviews.length === 0)) return

  try {
    const reviewsArray = Array.isArray(reviews) ? reviews : [reviews]
    await Promise.all(
      reviewsArray.map(async review => {
        const fileName = generateReviewFileName(review)
        const reviewKey = `reviews/${fileName}`

        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: reviewKey
          })
        )

        logger(`Object removed from S3: ${reviewKey}`, 'info')
      })
    )
  } catch (error) {
    logger(`Error deleting reviews from S3: ${error.message}`, 'error')
  }
}
export async function deleteReviewsByProfileFromS3 (userProfile) {
  try {
    const { userId, reviewSiteSlug } = userProfile
    console.log(userId, reviewSiteSlug)

    const prefix = `reviews/${sanitize(userId)}_${sanitize(reviewSiteSlug)}`
    const listParams = {
      Bucket: AWS_BUCKET_NAME,
      Prefix: prefix
    }

    const listedObjects = await s3Client.send(
      new ListObjectsV2Command(listParams)
    )
    if (!listedObjects.Contents || listedObjects.Contents.length === 0) return

    const objectsToDelete = listedObjects.Contents.map(obj => ({
      Key: obj.Key
    }))

    await s3Client.send(
      new DeleteObjectsCommand({
        Bucket: AWS_BUCKET_NAME,
        Delete: { Objects: objectsToDelete }
      })
    )

    logger(
      `Deleted ${objectsToDelete.length} reviews from S3 for profile: ${prefix}`,
      'info'
    )
  } catch (error) {
    logger(`Error deleting reviews by profile: ${error.message}`, 'error')
  }
}
