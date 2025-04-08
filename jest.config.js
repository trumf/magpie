module.exports = {
  testEnvironment: "jsdom",
  testEnvironmentOptions: {
    url: "http://localhost",
  },
  moduleNameMapper: {
    // Handle CSS imports (with CSS modules)
    "\\.module\\.css$": "identity-obj-proxy",
    // Handle CSS imports (without CSS modules)
    "\\.css$": "<rootDir>/__mocks__/styleMock.js",
    // Handle static assets
    "\\.(jpg|jpeg|png|gif|svg)$": "<rootDir>/__mocks__/fileMock.js",
    // Handle module aliases
    "^@/components/(.*)$": "<rootDir>/components/$1",
  },
  setupFilesAfterEnv: ["<rootDir>/jest.setup.js"],
  transform: {
    "^.+\\.(js|jsx)$": "babel-jest",
  },
  transformIgnorePatterns: [
    "/node_modules/(?!(lucide-react|react-markdown|remark-parse|mdast-util-from-markdown|micromark|micromark-core-commonmark|micromark-util-decode-numeric-character-reference|micromark-util-character|micromark-util-resolve-all|unist-util-visit|unist-util-visit-parents|hast-util-from-html)/)",
  ],
  testPathIgnorePatterns: ["<rootDir>/node_modules/", "<rootDir>/cypress/"],
  collectCoverageFrom: [
    "src/**/*.{js,jsx}",
    "!src/**/*.test.{js,jsx}",
    "!**/node_modules/**",
  ],
  coverageThreshold: {
    global: {
      statements: 70,
      branches: 70,
      functions: 70,
      lines: 70,
    },
  },
};
