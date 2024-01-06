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

export async function handleStandardErrors (asyncFunction) {
  try {
    await asyncFunction()
  } catch (error) {
    console.error('Error:', error.message || error)
  }
}
