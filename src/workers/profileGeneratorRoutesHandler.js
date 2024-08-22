import fs from 'fs/promises'
import path from 'path'
import { logger } from '../utils/logger.js'

const __dirname = path.resolve()

export default async app => {
  const routesPath = path.join(__dirname, 'src', 'profileGeneratorRoutes')

  try {
    const files = await fs.readdir(routesPath)

    for (const file of files) {
      if (file.endsWith('GeneratorRouter.js')) {
        try {
          const routerModule = await import(path.join(routesPath, file))
          const router = routerModule.default
          app.use(router)
        } catch (e) {
          logger(`Error importing souter >>>${file}<<<: ${e}`, 'error')
        }
      }
    }
  } catch (error) {
    logger(`Error reading router files: ${error}`, 'error')
  }
}
