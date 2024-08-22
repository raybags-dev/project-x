import nodemailer from 'nodemailer'
import { config } from 'dotenv'
import { generatePasswordResetToken } from '../src/models/user.js'
import { logger } from '../src/utils/logger.js'

config()

const { EMAIL_PROVIDER, EMAIL_FOR_NOTIFICATION, EMAIL__APP_PASS } = process.env
const transporter = nodemailer.createTransport({
  service: EMAIL_PROVIDER,
  auth: {
    user: EMAIL_FOR_NOTIFICATION,
    pass: EMAIL__APP_PASS
  }
})
export async function sendEmail (
  emailData,
  recipient,
  verificationToken,
  callback
) {
  try {
    return
    const verificationLink = verificationToken
      ? `Verification Token: ${verificationToken}`
      : ''

    const emailBody = `${emailData.body}\n\n${verificationLink}`

    const mailOptions = {
      from: EMAIL_FOR_NOTIFICATION,
      to: recipient,
      subject: emailData.title,
      text: emailBody
    }

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        logger(`Error sending email: ${error.message}`, 'error')
        if (callback) callback(error.message)
      } else {
        logger(`Email sent: ${info.response}`, 'info')
        if (callback) callback(null, info.response)
      }
    })
  } catch (e) {
    logger(e.message, 'error')
  }
}
export async function generateVerificationLink (verificationToken) {
  try {
    if (verificationToken) {
      return verificationToken
    } else {
      return await generatePasswordResetToken()
    }
  } catch (error) {
    logger(`Error generating verification link: ${error}`, 'error')
    return ''
  }
}
export async function emailerhandler (error, response) {
  try {
    if (error) {
      logger(`Email sending failed: ${error}`, 'error')
    } else {
      logger(`@@: ${response}`, 'info')
    }
  } catch (e) {
    logger(`Email notification handler failed: ${e.message}`, 'error')
  }
}
