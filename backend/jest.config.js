module.exports = {
  testEnvironment: 'node',
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/tests/**',
    '!src/index.js',
  ],
  testMatch: [
    '**/src/tests/**/*.test.js',
  ],
  verbose: true,
  testTimeout: 10000,
};
