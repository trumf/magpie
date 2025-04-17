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
3.  **`jest.setup.js`**: The primary global setup file run before _all_ tests. It enables Jest's fake timers (`jest.useFakeTimers()`) and provides basic polyfills/mocks for browser APIs not fully implemented by JSDOM (like `FileReader`, `JSZip`, and a minimal `IndexedDB`). It uses Jest's standard `jest.fn()` for mocking. It also includes a global `afterEach` hook to clear all mocks and timers (`jest.clearAllMocks()`, `jest.clearAllTimers()`).
4.  **`annotation-test-setup.js`**: Provides a _detailed_ mock implementation for `IndexedDB` specifically for tests involving `AnnotationStorage`. It overrides the basic mock from `jest.setup.js`. This file is **imported directly** at the top of `AnnotationStorage.test.js`.
5.  **`annotation-viewer-test-setup.js`**: Provides UI-specific mocks (`fetch`, `localStorage`, `sessionStorage`, `URL.createObjectURL`) needed for `AnnotationViewer` tests. This file is **imported directly** at the top of `AnnotationViewer.test.js`. It also includes an `afterEach` hook to clear its specific mocks.

This approach ensures that global setup (timers, basic polyfills) applies everywhere, while specialized mocks are loaded only where needed, avoiding conflicts and keeping the global scope cleaner.

## Testing Approach: Jest with JSDOM

We use Jest with the JSDOM environment as our single testing approach. This allows us to test browser-specific code, including DOM manipulation and interactions with browser APIs (which are mocked via our setup files).

To run all tests:

```bash
npm test
```

## Mocking Approach

Since we're testing code that uses browser APIs not available in Node.js (even with JSDOM simulating the DOM), we mock these APIs using Jest's built-in functionalities.

### 1. Jest's Mocking API

We now rely entirely on Jest's standard mocking capabilities, available globally in all test files:

- **`jest.fn()`**: Creates mock functions. Used extensively within our setup files (`jest.setup.js`, `annotation-test-setup.js`, `annotation-viewer-test-setup.js`) to provide mock implementations for browser APIs.
- **`jest.spyOn(object, methodName)`**: Creates spies on existing object methods, allowing you to track calls or provide mock implementations without replacing the original method entirely.
- **`jest.mock('path/to/module')`**: Used to mock entire ES modules.
- **Matchers**: We use Jest's built-in assertion matchers like `toHaveBeenCalled()`, `toHaveBeenCalledWith()`, `toHaveBeenCalledTimes()`, `expect(mockFn).toHaveReturnedWith()`, etc., to verify mock interactions.

_We have removed the previous custom mock factory (`createMockFn`) and the custom `global.jest` object._

### 2. Fake Timers

`jest.setup.js` calls `jest.useFakeTimers()` globally. This allows tests to control time-based operations like `setTimeout` and `setInterval` using:

- `jest.advanceTimersByTime(ms)`
- `jest.runAllTimers()`
- `jest.clearAllTimers()` (called automatically in `afterEach`)

### 3. Browser API Mocks

Specific browser APIs are mocked globally in `jest.setup.js` or in the specialized setup files:

- **IndexedDB**: Basic mock in `jest.setup.js` (using `jest.fn`), more detailed mock in `annotation-test-setup.js` (also using `jest.fn` internally).
- **FileReader**: Mocked in `jest.setup.js` using `jest.fn`.
- **JSZip**: Mocked in `jest.setup.js` using `jest.fn`.
- **fetch, localStorage, sessionStorage, URL**: Mocked in `annotation-viewer-test-setup.js` using `jest.fn` and custom mock objects.

## Testing Database Operations

Database testing (IndexedDB) presents challenges due to its asynchronous, event-based nature. Our approach involves:

1.  **Detailed Mocks**: Using the specialized mocks in `annotation-test-setup.js` which leverage `jest.fn` and simulate the asynchronous event flow (`onsuccess`, `onerror`).
2.  **Controlled Events**: Test code can control the mock's behavior (e.g., simulating success or failure) and use Jest's timer controls (`jest.advanceTimersByTime`) and async/await to manage the flow.
3.  **Promise Wrapping**: Testing the promise wrappers around the IndexedDB operations in our code.
4.  **State Reset**: Mock state is generally reset via the `afterEach` hooks calling `jest.clearAllMocks()` and `jest.clearAllTimers()`. Specific state (like localStorage) might be cleared manually in relevant `afterEach` hooks.

## Best Practices

1.  **Isolation**: Keep tests focused on a single module or function.
2.  **Setup Imports**: For tests needing specialized mocks (like `AnnotationStorage`, `AnnotationViewer`), import the specific setup file directly (`import './annotation-test-setup.js';`).
3.  **Standard Mocking**: Use `jest.fn()`, `jest.spyOn()`, and Jest's matchers for all mocking and spying.
4.  **Reset State**: Rely on the global `afterEach` in `jest.setup.js` and specific `afterEach` hooks in specialized setups for state cleanup.
5.  **Test Helpers**: Consider creating test-specific helper functions (within test files or separate helper modules) if it significantly simplifies complex testing scenarios.
6.  **Avoid Database Dependencies**: For simple utility function tests, avoid involving database mocks if possible.

## Troubleshooting Common Issues

### "require is not defined" Error

This error occurs when trying to use CommonJS (`require`) in our ES module environment.
**Solution:** Always use ES module `import`/`export` syntax.

### Mocking Issues (`TypeError: xxx is not a function` or Matcher Failures)

If a Jest matcher fails (e.g., `expect(fn).toHaveBeenCalled()`), ensure that:

- The function (`fn`) being asserted _is_ actually a mock created via `jest.fn()` or `jest.spyOn()`.
- Mocks are being correctly cleared between tests (check `afterEach` hooks).
- Asynchronous operations involving mocks are properly handled (e.g., using `await` with promises returned by mocks, advancing timers if needed).

### IndexedDB Mocking Issues

If tests involving IndexedDB fail unexpectedly:

1.  Check that `AnnotationStorage.test.js` correctly imports `./annotation-test-setup.js` at the top.
2.  Verify that asynchronous operations (mock `onsuccess`/`onerror` calls, triggered via `setTimeout` in the mock) are correctly awaited or handled using Jest's timer controls (`jest.advanceTimersByTime()`).
3.  Ensure mock state is properly reset between tests by the `afterEach` hooks.

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
