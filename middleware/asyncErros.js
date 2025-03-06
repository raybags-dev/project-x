export function asyncMiddleware (handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res)
    } catch (ex) {
      if (ex.name === 'CastError') {
        const statusCode = 400
        return res.status(statusCode).json({
          status: 'mongo-error',
          message: 'Invalid document ID format'
        })
      }
      const statusCode = ex.statusCode || 500
      res
        .status(statusCode)
        .json({ status: 'async-error - failed', message: ex })
      console.error('Error message:', ex.message)
      if (typeof next === 'function') {
        console.log(ex.message)
        next({ error: 'something went wrong!\n', message: ex })
      }
    }
  }
}

export function handleStandardErrors (fn) {
  return async function (...args) {
    try {
      return await fn(...args)
    } catch (error) {
      console(`Error in function ${fn.name}: ${error.message}`)
      return null
    }
  }
}
