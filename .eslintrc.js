module.exports = {
  root: true,
  extends: ["react-app", "react-app/jest"],
  env: {
    browser: true,
    node: true,
    es6: true,
  },
  globals: {
    Cypress: "readonly",
    cy: "readonly",
    before: "readonly",
    after: "readonly",
    beforeEach: "readonly",
    afterEach: "readonly",
    describe: "readonly",
    it: "readonly",
    expect: "readonly",
  },
  overrides: [
    {
      files: ["cypress/**/*.js", "**/*.cy.js"],
      env: {
        mocha: true,
      },
    },
  ],
};
