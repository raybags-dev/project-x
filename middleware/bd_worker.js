import AWS from 'aws-sdk'
import { promisify } from 'util'
import { Readable } from 'stream'
import { sendEmail } from './emailer.js'
import {
  S3Client,
  CreateBucketCommand,
  DeleteObjectCommand
} from '@aws-sdk/client-s3'
import { config } from 'dotenv'
config()
const {
  AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY,
  AWS_BUCKET_NAME,
  AWS_REGION,
  RECIPIENT_EMAIL
} = process.env
import { REVIEW } from '../src/models/documentModel.js'
// S3 client
const s3 = new S3Client({
  region: AWS_REGION,
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_SECRET_ACCESS_KEY
  }
})
const S_3 = new AWS.S3({
  accessKeyId: AWS_ACCESS_KEY_ID,
  secretAccessKey: AWS_SECRET_ACCESS_KEY,
  region: AWS_REGION
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
    console.log(error.message, 'in dbFileUploader')
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

    console.log('Bucket created successfully.\n')
    return AWS_BUCKET_NAME
  } catch (err) {
    if (err.Code === 'BucketAlreadyOwnedByYou') {
      console.log(`Bucket ${err.BucketName} already exists.`)
      return err.BucketName
    }
    if (err.statusCode === 404) {
      console.log(`Bucket does not exist.`)
      return false
    }
    if (err.Code === 'BucketAlreadyOwnedByYou') {
      console.log(`Bucket ${err.BucketName} already exists.`)
      return err.BucketName
    }
    if (err.httpStatusCode === 409) {
      console.log(`Bucket ${err.BucketName} already exists.`)
      return err.BucketName
    }
  }
}
//saves to aws-bucket
export async function saveImagesToS3 (files) {
  try {
    const urls = []
    const s3 = new AWS.S3()

    for (let i = 0; i < files.length; i++) {
      const file = files[i]

      // Check if the file exists in MongoDB
      const existingDocument = await REVIEW.findOne({
        originalname: file.originalname
      })

      if (existingDocument) {
        // File already exists, return the URL and signature from the database
        urls.push({
          url: existingDocument.url,
          signature: existingDocument.signature,
          error: 'Duplication detected'
        })
      } else {
        // File does not exist, upload to S3 and save to MongoDB
        const uploadParams = {
          Bucket: AWS_BUCKET_NAME,
          Body: file.data,
          Key: file.filename,
          ContentType: file.contentType
        }

        const signedUrlParams = {
          Bucket: AWS_BUCKET_NAME,
          Key: file.filename,
          Expires: 604800
        }

        await s3.upload(uploadParams).promise()
        const signedUrls = await s3.getSignedUrlPromise(
          'getObject',
          signedUrlParams
        )

        const urlParts = signedUrls.split('?')
        const url = urlParts[0]
        const signature = urlParts[1]

        // Create a new document for the uploaded file
        const newDocument = new REVIEW({
          ...file,
          url: url,
          signature: signature,
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        })
        // Save the new document to the database
        await newDocument.save()

        urls.push({
          url: newDocument.url,
          signature: newDocument.signature,
          message: 'File uploaded successfully'
        })
      }
    }
    // notify incase of successful upload
    const uploadEmailData = {
      title: 'Upload successful',
      body: `There has been a successful upload to your S3 bucket "${AWS_BUCKET_NAME}" in ${AWS_REGION}. A total of ${urls.length}, was uploaded successfuly`
    }
    await sendEmail(uploadEmailData, RECIPIENT_EMAIL)

    return urls
  } catch (err) {
    console.log(err)
    if (err.code === 'NoSuchBucket') {
      console.error('This bucket does not exist')
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
      // notify incase of successful deleted
      const deleteEmailData = {
        title: 'Document deleted successful',
        body: `This document:\n${filename}\n has succesfully been deleted from your S3 bucket "${AWS_BUCKET_NAME}" in ${AWS_REGION}.`
      }
      await sendEmail(deleteEmailData, RECIPIENT_EMAIL)
      return console.log(`File ${filename} deleted successfully from S3`)
    }
  } catch (err) {
    console.error(`Error deleting file ${filename} from S3: ${err.message}`)
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

        const newUrl = await promisify(S_3.getSignedUrl.bind(S_3))(
          'getObject',
          getObjectParams
        )
        console.log(newUrl)
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
      console.error(err)
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
    console.log(error.message)
    throw error
  }
}
