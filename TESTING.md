# Testing ZipFileManager

This document outlines our approach to testing the ZipFileManager module and related components, which use browser APIs like IndexedDB and FileReader that require special handling in a test environment.

## Test Organization

We use Jest as our sole test runner. Tests are organized into multiple focused `*.test.js` files (e.g., `ZipFileManager.core.test.js`, `AnnotationStorage.test.js`) to achieve better isolation and maintainability.

## Module System Requirements

Our project uses ES modules (`import`/`export`) exclusively. This has important implications for testing:

### ES Modules vs CommonJS

- **Package Configuration**: Our `package.json` includes `"type": "module"`, making ES modules the default.
- **Import Syntax**: All files (including tests) must use `import`/`export` syntax, not CommonJS `require`.
- **Jest Configuration**: Jest is configured with `babel-jest` to transform ES modules correctly during testing.

### Testing Policies for ES Modules

1.  **Always use import/export syntax**: Never use `require()` in any test or production code.
2.  **Mock imports correctly**: Use `jest.mock()` for mocking modules.

## Test Setup Organization

We use multiple files to manage test setup mocks and configurations:

1.  **`jest.config.js`**: Configures Jest to use the `jsdom` environment, find all `*.test.js` files, use Babel for transformations, and run a global setup file.
2.  **`.babelrc`**: Configures Babel (`@babel/preset-env`) to transpile JavaScript for the current Node environment, ensuring compatibility with Jest.
3.  **`jest.setup.js`**: The primary global setup file run before all tests. It provides custom mock implementations for browser APIs (IndexedDB, FileReader, JSZip) and a basic Jest-like global API (`jest.fn`, `jest.spyOn`, etc.) needed because we run Jest in a Node environment.
4.  **`annotation-test-setup.js`**: Provides enhanced IndexedDB mocking specifically for `AnnotationStorage` tests. It is **imported directly** at the top of `AnnotationStorage.test.js`.
5.  **`annotation-viewer-test-setup.js`**: Provides UI-specific mocks (`fetch`, `localStorage`, etc.) for `AnnotationViewer` tests. It is **imported directly** at the top of `AnnotationViewer.test.js`.

This approach ensures that global mocks are available everywhere, while specialized mocks are loaded only where needed, avoiding conflicts and keeping the global scope cleaner.

## Testing Approach: Jest with JSDOM

We use Jest with the JSDOM environment as our single testing approach. This allows us to test browser-specific code, including DOM manipulation and interactions with browser APIs (which are mocked via our setup files).

To run all tests:

```bash
npm test
```

## Mocking Approach

Since we're testing code that uses browser APIs not available in Jest's Node environment (even with JSDOM simulating the DOM), we created custom mocks in `jest.setup.js`:

### 1. Mock Implementation (`createMockFn`)

We created a custom mock function implementation (`createMockFn()`) that mimics basic Jest mock functionality:

- Tracks function calls (`.mock.calls`).
- Supports setting return values (`.mockReturnValue()`).
- Supports custom implementations (`.mockImplementation()`).
- Includes basic promise helpers (`.mockResolvedValue()`, `.mockRejectedValue()`).
- Includes basic reset/restore capabilities.

### 2. Global `jest` API

We added a limited, custom implementation of Jest's mocking API to the global object in `jest.setup.js`:

- `jest.fn()`: Creates mock functions using `createMockFn`.
- `jest.spyOn()`: Creates spies on object methods.
- `jest.useFakeTimers() / jest.advanceTimersByTime()`: Basic timer mocking.
- `jest.resetAllMocks() / jest.clearAllMocks() / jest.restoreAllMocks()`: Functions to manage the state of mocks created via `jest.fn` or `jest.spyOn`.

_Note: This custom API might not have the full feature set of Jest's built-in API._

### 3. Browser API Mocks

Specific browser APIs are mocked globally in `jest.setup.js` or in the specialized setup files:

- **IndexedDB**: Basic mock in `jest.setup.js`, more detailed mock in `annotation-test-setup.js`.
- **FileReader**: Mocked in `jest.setup.js`.
- **JSZip**: Mocked in `jest.setup.js`.
- **fetch, localStorage, sessionStorage**: Mocked in `annotation-viewer-test-setup.js`.

## Testing Database Operations

Database testing (IndexedDB) presents challenges due to its asynchronous, event-based nature. Our approach involves:

1.  **Detailed Mocks**: Using the specialized mocks in `annotation-test-setup.js` or controlling the basic mocks from `jest.setup.js`.
2.  **Controlled Events**: Mock implementations manually trigger `onsuccess` or `onerror` events within tests to simulate the asynchronous API behavior reliably.
3.  **Promise Wrapping**: Testing the promise wrappers around the IndexedDB operations in our code.
4.  **State Reset**: Ensuring mock IndexedDB state is reset between tests (often handled within `beforeEach` or `afterEach` blocks in the test files).

## Best Practices

1.  **Isolation**: Keep tests focused on a single module or function.
2.  **Setup Imports**: For tests needing specialized mocks (like `AnnotationStorage`, `AnnotationViewer`), import the specific setup file directly within the test file.
3.  **Custom Mocking**: Use the global mocks from `jest.setup.js` for common browser APIs.
4.  **Reset State**: Use `beforeEach` or `afterEach` with `jest.resetAllMocks()` or manual resets to ensure test independence.
5.  **Test Helpers**: Consider creating test-specific helper methods in the production code if it significantly simplifies complex testing scenarios (e.g., direct state manipulation bypassing mocks).
6.  **Avoid Database Dependencies**: For simple utility function tests, avoid involving database mocks if possible.

## Troubleshooting Common Issues

### "require is not defined" Error

This error occurs when trying to use CommonJS (`require`) in our ES module environment.
**Solution:** Always use ES module `import`/`export` syntax.

### Mocking Issues (`TypeError: xxx is not a function`)

If a Jest matcher fails because a function is not recognized as a mock (e.g., `TypeError: received.getMockName is not a function`), it might indicate an incompatibility between Jest's expectations and our custom mock implementation in `jest.setup.js`.
**Solutions:** - Double-check that the function being asserted _was_ created using `jest.fn()` or `jest.spyOn()` from our custom global API. - If the issue persists, consider simplifying the assertion (e.g., checking `mock.calls.length` instead of `toHaveBeenCalled`). - Ensure mocks are correctly reset in `beforeEach`.

### IndexedDB Mocking Issues

If tests involving IndexedDB fail unexpectedly:

1.  Check if the correct setup file is being imported (`annotation-test-setup.js` for `AnnotationStorage.test.js`).
2.  Verify that mock state (e.g., mock database content, request handlers) is properly reset or configured in `beforeEach`.
3.  Ensure asynchronous operations (mock `onsuccess`/`onerror` calls) are correctly awaited or handled in the test.

## Running Tests

To run the entire test suite:

```bash
npm test
```

To run a specific test file:

```bash
npm test -- path/to/your.test.js
# or using npx directly:
# npx jest path/to/your.test.js
```
