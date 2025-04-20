/** @type {import('jest').Config} */
export default {
  // Use JSDOM environment for browser APIs
  testEnvironment: "jsdom",

  // Define which files are tests
  testMatch: ["**/*.test.js"],

  // Handle ESM imports using Babel
  // extensionsToTreatAsEsm: [".js"], // Removed as Jest infers from package.json type:"module"
  transform: {
    "^.+\\.js$": "babel-jest",
  },

  // Global setup script (mocks, etc.)
  setupFilesAfterEnv: ["./jest.setup.js"],

  // Remove moduleNameMapper unless specifically needed later
  // moduleNameMapper: {
  //   "^(\\.{1,2}/.*)\\.js$": "$1",
  // },

  // Remove transformIgnorePatterns as Babel handles transforms
  // transformIgnorePatterns: ["/node_modules/(?!.*\\.mjs$)"],

  // Remove the projects configuration
  // projects: [
  //   {
  //     displayName: "annotation-tests",
  //     testMatch: ["**/AnnotationStorage.test.js"],
  //     setupFilesAfterEnv: ["./annotation-test-setup.js"],
  //     testEnvironment: "jsdom",
  //   },
  //   {
  //     displayName: "annotation-viewer-tests",
  //     testMatch: ["**/AnnotationViewer.test.js"],
  //     setupFilesAfterEnv: ["./annotation-viewer-test-setup.js"],
  //     testEnvironment: "jsdom",
  //   },
  //   {
  //     displayName: "other-tests",
  //     testMatch: [
  //       "**/?(*.)+(spec|test).js",
  //       "!**/AnnotationStorage.test.js",
  //       "!**/AnnotationViewer.test.js",
  //     ],
  //     setupFilesAfterEnv: ["./jest.setup.js"],
  //     testEnvironment: "jsdom",
  //   },
  // ],
};
