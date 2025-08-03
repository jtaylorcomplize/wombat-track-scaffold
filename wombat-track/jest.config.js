export default {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.spec.js', '**/tests/**/*.test.js', '**/tests/**/*.spec.ts', '**/tests/**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  preset: 'ts-jest',
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