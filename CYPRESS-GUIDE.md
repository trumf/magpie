# Cypress Testing Guide for Magpie

This document provides a comprehensive guide on how to set up, run, and maintain Cypress tests for the Magpie application.

## Table of Contents

- [Introduction](#introduction)
- [Test Structure](#test-structure)
- [Running Tests](#running-tests)
- [Writing New Tests](#writing-new-tests)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Introduction

Cypress is an end-to-end testing framework that helps us ensure our application works correctly from the user's perspective. In Magpie, we use Cypress to test:

- File import functionality
- Navigation between articles
- Data persistence across page refreshes
- Data storage and retrieval

## Test Structure

Our Cypress tests are organized as follows:

```
cypress/
├── e2e/
│   ├── import.cy.js        # Tests for file import functionality
│   ├── navigation.cy.js    # Tests for navigation between articles
│   ├── persistence.cy.js   # Tests for data persistence across page refreshes
│   └── storage.cy.js       # Tests specifically for storage mechanisms
├── support/
│   ├── commands.js         # Custom Cypress commands
│   └── e2e.js              # General support configuration
└── fixtures/               # Test data (if needed)
```

The main configuration file is `cypress.config.js` in the project root.

## Running Tests

### Prerequisites

1. Make sure you have Node.js and npm installed
2. Ensure all dependencies are installed: `npm install`

### Starting the Application

Before running Cypress tests, you need to have your application running:

```bash
npm run start
```

This will start the React application on http://localhost:3000.

### Running Cypress Tests

There are two main ways to run Cypress tests:

#### 1. Interactive Mode (Cypress Test Runner)

```bash
npm run cypress
# or
npx cypress open
```

This opens the Cypress Test Runner GUI where you can:

- Select the E2E Testing option
- Choose a browser (Chrome, Firefox, Electron, etc.)
- See a list of all test files
- Run individual tests by clicking on them
- Watch tests execute in real-time with time-travel debugging
- View detailed test results and screenshots

#### 2. Headless Mode (Command Line)

```bash
npm run cypress:run
# or
npx cypress run
```

This runs all tests in headless mode (without UI) and is ideal for:

- CI/CD pipelines
- Quick test runs in terminal
- Getting test results without the visual interface

### Running Specific Tests

To run a specific test file:

```bash
npx cypress run --spec "cypress/e2e/import.cy.js"
```

To run tests in a specific browser:

```bash
npx cypress run --browser chrome
```

## Writing New Tests

### Test Structure

Each test file should follow this structure:

```javascript
describe("Feature being tested", () => {
  beforeEach(() => {
    // Setup code that runs before each test
    cy.visit("/");

    // Clear IndexedDB to start fresh
    cy.clearIndexedDB("markdownDB");

    // Reload the page
    cy.reload();
  });

  it("should do something specific", () => {
    // Test steps
    // ...

    // Assertions
    cy.something().should("exist");
  });
});
```

### Testing Tips

1. **Use Custom Commands**: For repeated actions, create custom commands in `cypress/support/commands.js`:

```javascript
// Example custom command we've created
Cypress.Commands.add("clearIndexedDB", (dbName) => {
  cy.window().then((win) => {
    win.indexedDB.deleteDatabase(dbName);
  });
});
```

2. **Handling File Imports**: For testing file imports, we use a technique that bypasses the file dialog:

```javascript
cy.get('input[type="file"]').then((input) => {
  // Create a test file
  const testContent = "# Test File\n\nThis is test content.";
  const blob = new Blob([testContent], {type: "text/markdown"});
  const testFile = new File([blob], "test.md", {type: "text/markdown"});

  // Set up DataTransfer object
  const dataTransfer = new DataTransfer();
  dataTransfer.items.add(testFile);

  // Set files and trigger change event
  input[0].files = dataTransfer.files;
  input[0].dispatchEvent(new Event("change", {bubbles: true}));
});
```

3. **Testing IndexedDB Operations**: When testing storage operations, it's better to use direct unit tests, but Cypress can verify the resulting UI state.

## Best Practices

1. **Keep Tests Independent**: Each test should be able to run in isolation.

2. **Clear State Between Tests**: Use `beforeEach` to reset the application state.

3. **Use Descriptive Test Names**: Make it clear what functionality is being tested.

4. **Use Data Attributes for Testing**: When possible, add `data-cy` attributes to make selecting elements more reliable:

```html
<!-- In your React component -->
<button data-cy="open-menu">Open Menu</button>

<!-- In your Cypress test -->
cy.get('[data-cy=open-menu]').click();
```

5. **Avoid Hardcoded Timeouts**: Instead of `cy.wait(1000)`, use assertions to wait for elements or state changes:

```javascript
// Avoid this
cy.wait(1000);
cy.get(".sidebar");

// Do this instead
cy.get(".sidebar").should("be.visible");
```

6. **Use Screenshots and Videos**: When tests fail in CI, screenshots and videos can help diagnose the issue.

## Troubleshooting

### Common Issues and Solutions

1. **Tests Can't Find Elements**:

   - Make sure your app is running on the expected URL
   - Check your selectors - prefer data attributes when possible
   - Try using more specific selectors
   - Use `.debug()` to inspect the DOM at a certain point

2. **Tests Fail in CI but Pass Locally**:

   - May be related to timing issues - add assertion-based waiting
   - Check for environment-specific differences
   - Make sure CI is using the right configuration

3. **File Import Tests Fail**:

   - Check if the file blob is being created correctly
   - Ensure event dispatching is working
   - Consider testing this functionality with unit tests instead

4. **Issues with IndexedDB**:
   - Use `cy.clearIndexedDB` consistently before tests
   - Consider using direct unit tests for detailed IndexedDB functionality
   - For persistence tests, make sure the app has time to save data before testing retrieval

### Debugging Techniques

1. **Use `.debug()`**: Pauses execution and logs the current subject to the console:

```javascript
cy.get(".sidebar").debug();
```

2. **Use `.then()` with console.log**: For inspecting values:

```javascript
cy.get(".article-title").then(($el) => {
  console.log($el.text());
});
```

3. **Time-Travel Debugging**: In the Cypress Test Runner, use the timeline to go back to any step.

4. **Screenshots**: Take screenshots at critical points:

```javascript
cy.screenshot("after-import");
```

---

For more information, refer to the [official Cypress documentation](https://docs.cypress.io/).
