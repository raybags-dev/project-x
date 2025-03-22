import processAuthFiles from './core_module.js'

async function authPrepper (run_pipeline) {
  try {
    const folders = ['src/_data_/headers/']

    await processAuthFiles(run_pipeline, folders)
  } catch (e) {
    console.error(e.message)
  }
}
export default authPrepper
