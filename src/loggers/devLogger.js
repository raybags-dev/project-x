export function devLogger (message, logLevel = 'info') {
  const formattedMessage = `(${new Date().toISOString()}): ${message}`

  switch (logLevel.toLowerCase()) {
    case 'info':
      console.log(`> ${formattedMessage}`)
      break
    case 'warn':
      console.warn(`> ${formattedMessage}`)
      break
    case 'error':
      console.error(`> ${formattedMessage}`)
      break
    case 'table':
      if (
        Array.isArray(message) &&
        message.length > 0 &&
        typeof message[0] === 'object'
      ) {
        console.table(message)
      } else {
        console.log(`> ${formattedMessage}`)
      }
      break
    default:
      console.log(`Unknown log level: ${logLevel}`)
  }
}
