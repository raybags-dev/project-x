import cron from 'node-cron'
import axiosInstance from '../src/utils/proxy.js'

async function wakeupService (req, res, next) {
  try {
    await axiosInstance.get(
      'https://ray-project-x-5b3928eb0bca.herokuapp.com/#'
    )
    next()
  } catch (error) {
    console.error('Error pinging server: ', error)
    next()
  }
}

function dynoActivator () {
  const cron_schedule = '59 29 * * * *'
  cron.schedule(cron_schedule, () => {
    console.log('Pinging to keep the dyno awake...')

    axiosInstance
      .get('https://ray-project-x-5b3928eb0bca.herokuapp.com/#')
      .then(response => {
        console.log(
          response.status === 200
            ? `> is_dyno_awake: ${response.status === 200}`
            : 'false'
        )
      })
      .catch(error => {
        console.error('Error pinging Heroku app:', error)
      })
  })
}

export { dynoActivator, wakeupService }
