/** @type {import('jest').Config} */
export default {
  // Use JSDOM environment for browser APIs
  testEnvironment: "jsdom",

  // Define which files are tests - comprehensive patterns to find all test files
  testMatch: [
    "**/tests/**/*.test.js",
    "**/*.test.js",
    "**/src/**/*.test.js",
    "**/parser/**/*.test.js",
    "**/db/**/*.test.js",
    "**/view/**/*.test.js",
    "**/status/**/*.test.js",
  ],

  // Essential for ES modules support
  preset: null,

  // Handle ESM imports using Babel
  transform: {
    "^.+\\.js$": "babel-jest",
  },

  // Global setup script (mocks, etc.)
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],

  // Module resolution for ES modules - handle .js extension imports
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },

  // Transform ignore patterns - let Babel handle all JS files
  transformIgnorePatterns: ["node_modules/(?!.*\\.mjs$)"],

  // Verbose output to see all tests
  verbose: true,

  // Test timeout
  testTimeout: 10000,

  // Add root directory configuration
  rootDir: ".",
};
