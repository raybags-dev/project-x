import rateLimit from 'express-rate-limit'

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 10 minutes
  max: 100,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many requests. Please slow down and try again later.'
    })
  },
  standardHeaders: true,
  legacyHeaders: false
})

export const loginRateLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5,
  handler: (req, res) => {
    res.status(429).json({
      error: 'Too many login attempts. Please try again later.'
    })
  }
})

export const customRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Too many requests'
  } = options

  return rateLimit({
    windowMs, // default: 15 minutes
    max,
    handler: (req, res) => {
      res.status(429).json({ error: message })
    },
    standardHeaders: true,
    legacyHeaders: false
  })
}
