import { promisify } from 'util'
import { Readable } from 'stream'
import { sendEmail } from './emailer.js'
import {
  S3Client,
  DeleteObjectCommand,
  PutObjectCommand,
  GetObjectCommand,
  CreateBucketCommand
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { config } from 'dotenv'

import { REVIEW } from '../src/models/documentModel.js'
import { logger } from '../src/utils/logger.js'

config()

const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET_NAME,
  AWS_REGION,
  RECIPIENT_EMAIL
} = process.env

const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
})
export const dbFileUploader = async (files, req, res) => {
  try {
    const savedFiles = await saveImagesToS3(files)
    const duplicateFiles = savedFiles?.filter(file => file.error)

    if (duplicateFiles.length > 0) {
      return res.status(409).json({
        status: 'Conflict',
        message: 'One or more files already exist on the server.',
        files: duplicateFiles
      })
    }
    const validFiles = savedFiles.filter(
      file => file.message === 'File uploaded successfully'
    )
    return res.status(200).json({
      message: 'Files uploaded successfully',
      files: validFiles
    })
  } catch (error) {
    logger(`Error occured in <dbFileUploader>: {error.message}`, 'error')
    return res.status(500).json({
      status: 'Error',
      message:
        'An internal error occurred while uploading files: ' + error.message
    })
  }
}
export const createBucket = async () => {
  try {
    const command = new CreateBucketCommand({ Bucket: `${AWS_BUCKET_NAME}` })
    await s3.send(command)

    // notify incase of successful s3 bucket creation
    const createBucketEmailData = {
      title: 'Document deleted successful',
      body: `S3 bucket "${AWS_BUCKET_NAME}" successfully created in ${AWS_REGION}.`
    }
    await sendEmail(createBucketEmailData, RECIPIENT_EMAIL)

    logger('Bucket created successfully.\n', 'error')
    return AWS_BUCKET_NAME
  } catch (err) {
    if (err.Code === 'BucketAlreadyOwnedByYou') {
      logger(`Bucket ${err.BucketName} already exists.`, 'error')
      return err.BucketName
    }
    if (err.statusCode === 404) {
      logger(`Bucket does not exist.`, 'error')
      return false
    }
    if (err.Code === 'BucketAlreadyOwnedByYou') {
      logger(`Bucket ${err.BucketName} already exists.`, 'error')
      return err.BucketName
    }
    if (err.httpStatusCode === 409) {
      logger(`Bucket ${err.BucketName} already exists.`, 'error')
      return err.BucketName
    }
  }
}
//saves to aws-bucket
export async function saveImagesToS3 (files) {
  try {
    const urls = []

    for (let file of files) {
      // Check if the file exists in MongoDB
      const existingDocument = await REVIEW.findOne({
        originalname: file.originalname
      })

      if (existingDocument) {
        urls.push({
          url: existingDocument.url,
          signature: existingDocument.signature,
          error: 'Duplication detected'
        })
      } else {
        // Upload to S3 using v3 PutObjectCommand
        const uploadParams = {
          Bucket: AWS_BUCKET_NAME,
          Body: file.data,
          Key: file.filename,
          ContentType: file.contentType
        }
        await s3.send(new PutObjectCommand(uploadParams))

        const signedUrlParams = {
          Bucket: AWS_BUCKET_NAME,
          Key: file.filename
        }
        const signedUrl = await getSignedUrl(
          s3,
          new GetObjectCommand(signedUrlParams),
          { expiresIn: 604800 }
        )

        const urlParts = signedUrl.split('?')
        const url = urlParts[0]
        const signature = urlParts[1]

        const newDocument = new REVIEW({
          ...file,
          url: url,
          signature: signature,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })
        await newDocument.save()

        urls.push({
          url: newDocument.url,
          signature: newDocument.signature,
          message: 'File uploaded successfully'
        })
      }
    }

    // Send upload notification email (unchanged)
    const uploadEmailData = {
      title: 'Upload successful',
      body: `A total of ${urls.length} files were uploaded successfully to your S3 bucket "${AWS_BUCKET_NAME}".`
    }
    await sendEmail(uploadEmailData, RECIPIENT_EMAIL)

    return urls
  } catch (err) {
    logger(err, 'error')
    if (err.code === 'NoSuchBucket') {
      logger('This bucket does not exist', 'warn')
    }
  }
}
export async function deleteFromS3 (filename) {
  const command = new DeleteObjectCommand({
    Bucket: AWS_BUCKET_NAME,
    Key: filename
  })

  try {
    const response = await s3.send(command)
    if (response.$metadata.httpStatusCode === 204) {
      // Send delete notification email (unchanged)
      const deleteEmailData = {
        title: 'Document deleted successfully',
        body: `The document "${filename}" was deleted from your S3 bucket "${AWS_BUCKET_NAME}".`
      }
      await sendEmail(deleteEmailData, RECIPIENT_EMAIL)

      logger(`File ${filename} deleted successfully from S3.`, 'info')
    }
  } catch (err) {
    logger(`Error deleting file ${filename} from S3: ${err.message}`, 'error')
  }
}
export async function checkAndUpdateDocumentUrls (files) {
  const updatedDocs = []
  const notExpiredDocs = []

  for (const file of files) {
    try {
      const isExpired = await checkExpiryDate(file.expiresAt)

      if (isExpired) {
        const getObjectParams = {
          Bucket: AWS_BUCKET_NAME,
          Key: file.filename,
          Expires: 604800
        }

        const newUrl = await promisify(s_3.getSignedUrl.bind(s_3))(
          'getObject',
          getObjectParams
        )

        logger(newUrl, 'info')
        const urlParts = newUrl.split('?')
        const url = urlParts[0]
        const signature = urlParts[1]
        const updatedDoc = await REVIEW.findByIdAndUpdate(
          file._id,
          {
            url: url,
            signature: signature,
            expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          },
          { new: true }
        )
        updatedDocs.push(updatedDoc)
      } else {
        notExpiredDocs.push(file)
      }
    } catch (err) {
      logger(err, 'error')
    }
  }

  return [...notExpiredDocs, ...updatedDocs]
}
export async function checkExpiryDate (timestamp) {
  const dbTimestamp = new Date(Date.parse(timestamp))
  const currentDate = new Date()
  return dbTimestamp.getTime() < currentDate.getTime()
}
export async function createFileReadStream (imageData) {
  try {
    if (Buffer.isBuffer(imageData)) {
      const fileStream = new Readable()
      fileStream.push(imageData)
      fileStream.push(null)
      return fileStream
    } else {
      throw new Error('Invalid image data')
    }
  } catch (error) {
    logger(error.message, 'error')
    throw error
  }
}
