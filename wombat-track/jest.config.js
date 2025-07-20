export default {
  testEnvironment: 'node',
  preset: 'jest-puppeteer',
  testMatch: ['**/tests/**/*.spec.js', '**/tests/**/*.test.js'],
  transform: {},
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testTimeout: 30000,
  verbose: true,
  collectCoverage: false,
  coverageDirectory: 'coverage',
  coveragePathIgnorePatterns: [
    '/node_modules/',
    '/tests/utils/'
  ],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  }
};