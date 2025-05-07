export default async function isSubscribed (req, res, next) {
  try {
    const user = req.locals?.user

    if (!user || user.isSubscribed !== true) {
      const errorMsg = 'Active subscription is required!'
      console.error(`> Access denied: ${errorMsg}`)
      return res
        .status(403)
        .json({ error: 'Subscription required to access this resource.' })
    }

    next()
  } catch (error) {
    console.error('> Middleware error:', error)
    return res
      .status(500)
      .json({ error: 'Internal server error in subscription check.' })
  }
}
