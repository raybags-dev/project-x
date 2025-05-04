import {
  generateVerificationLink,
  sendNotificationEmail
} from '../../middleware/emailer.js'

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn((options, callback) =>
      callback(null, { response: 'Email sent' })
    )
  }))
}))

describe('Emailer Middleware', () => {
  it('should send a notification email successfully', async () => {
    const callback = jest.fn()
    await sendNotificationEmail(
      { title: 'Test Email', body: 'This is a test email' },
      'test@example.com',
      'verificationToken',
      callback
    )

    expect(callback).toHaveBeenCalledWith(null, 'Email sent')
  })

  it('should generate a verification link', async () => {
    const result = await generateVerificationLink('verificationToken')
    expect(result).toBe('verificationToken')
  })
})
