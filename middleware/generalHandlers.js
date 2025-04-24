export default function bindToContext (context) {
  if (typeof context !== 'object' || context === null) {
    throw new TypeError('Context must be a non-null object')
  }

  Object.keys(context).forEach(key => {
    if (typeof context[key] === 'function') {
      try {
        context[key] = context[key].bind(context)
      } catch (error) {
        console.error(`Error binding method (${key}):`, error)
      }
    }
  })
}
