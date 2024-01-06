import fs from 'fs/promises'
import path from 'path'

const __dirname = path.resolve()

export default async app => {
  const routesPath = path.join(__dirname, 'src', 'routes')

  try {
    const files = await fs.readdir(routesPath)

    for (const file of files) {
      if (file.endsWith('Router.js')) {
        try {
          const routerModule = await import(path.join(routesPath, file))
          const router = routerModule.default
          app.use(router)
        } catch (e) {
          console.log(`Error importing souter ${file}: `, e)
        }
      }
    }
  } catch (error) {
    console.error('Error reading router files:', error)
  }
}
