export default {
  testEnvironment: 'node',
  transform: {
    '^.+\\.js$': ['babel-jest', { configFile: './babel.config.json' }]
  },
  transformIgnorePatterns: ['/node_modules/(?!chalk)'],
  setupFiles: ['./tests/setupJest.js'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1'
  },
  testPathIgnorePatterns: ['/node_modules/', 'rateLimiterMiddleware.test.js']
}
