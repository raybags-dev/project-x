import { exec } from 'child_process'
import { promisify } from 'util'
import { devLogger } from '../utils/devLogger.js'

const execPromise = promisify(exec)

export async function clearDevPort (port) {
  try {
    // clear dev port if busy
    const { stdout, stderr } = await execPromise(
      `lsof -ti:${port} | xargs kill -9`
    )

    if (stderr) {
      devLogger(`Error killing process on port ${port}: ${stderr}`, 'error')
      throw new Error(`Could not kill process on port ${port}`)
    }
    devLogger(`Successfully cleared port ${port}`, 'info')
  } catch (error) {
    devLogger(
      `Error checking or killing port ${port}: ${error.message}`,
      'error'
    )
    throw error
  }
}
