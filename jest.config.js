/** @type {import('jest').Config} */
export default {
  testEnvironment: "jsdom",
  testMatch: [
    "**/*.test.js",
    "!**/*.ReadStatus.test.js",
    "!**/*.sort.test.js",
    "!**/HeadlineExtraction.test.js",
    "!**/ArticleNavigation.test.js",
  ],
  setupFiles: ["./jest.setup.js"],
  transform: {},
  moduleNameMapper: {
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transformIgnorePatterns: ["/node_modules/(?!.*\\.mjs$)"],
  setupFilesAfterEnv: ["./jest.setup.js"],
  // Indicate which test files should use additional setup
  projects: [
    {
      displayName: "annotation-tests",
      testMatch: ["**/AnnotationStorage.test.js"],
      setupFilesAfterEnv: ["./annotation-test-setup.js"],
      testEnvironment: "jsdom",
    },
    {
      displayName: "annotation-viewer-tests",
      testMatch: ["**/AnnotationViewer.test.js"],
      setupFilesAfterEnv: ["./annotation-viewer-test-setup.js"],
      testEnvironment: "jsdom",
    },
    {
      displayName: "other-tests",
      testMatch: [
        "**/?(*.)+(spec|test).js",
        // Exclude Node.js test runner files
        "!**/*.ReadStatus.test.js",
        "!**/*.sort.test.js",
        "!**/HeadlineExtraction.test.js",
        "!**/ArticleNavigation.test.js",
        // Also exclude the annotation tests which have their own projects
        "!**/AnnotationStorage.test.js",
        "!**/AnnotationViewer.test.js",
      ],
      setupFilesAfterEnv: ["./jest.setup.js"],
      testEnvironment: "jsdom",
    },
  ],
};
