import rateLimit from 'express-rate-limit'

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => req.ip || '127.0.0.1',
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many requests, please try again later' })
  }
})

export const loginRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour window
  max: 5, // start blocking after 5 requests
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: req => req.ip || '127.0.0.1',
  handler: (req, res) => {
    res.status(429).json({ error: 'Too many login attempts' })
  }
})

export const customRateLimiter = ({ message }) =>
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: req => req.ip || '127.0.0.1',
    handler: (req, res) => {
      res.status(429).json({ error: message })
    }
  })
