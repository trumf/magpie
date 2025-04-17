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

1.  **`jest.config.js`**: Configures Jest to use the `jsdom` environment, find all `*.test.js` files, use Babel for transformations, and run a _single_ global setup file (`jest.setup.js`).
2.  **`.babelrc`**: Configures Babel (`@babel/preset-env`) to transpile JavaScript for the current Node environment, ensuring compatibility with Jest.
3.  **`jest.setup.js`**: The primary global setup file run before _all_ tests. Its main responsibilities are:
    - Enabling Jest's fake timers (`jest.useFakeTimers()`).
    - Providing basic polyfills/mocks for ubiquitous browser APIs not fully implemented by JSDOM (e.g., `FileReader`, `JSZip`).
    - Providing a _minimal stub_ for `IndexedDB` to prevent errors in tests that don't need the detailed mock.
    - Including a global `afterEach` hook to clear all mocks and timers (`jest.clearAllMocks()`, `jest.clearAllTimers()`).
4.  **`annotation-test-setup.js`**: Provides the _detailed_ mock implementation for `IndexedDB` specifically for tests involving `AnnotationStorage` or annotation tags. It overrides the basic stub from `jest.setup.js`. It also enables _real timers_ (`jest.useRealTimers()`) for these specific tests due to issues with fake timers and the complex async nature of the mock. This file is **imported directly** at the top of `AnnotationStorage.test.js` and `AnnotationTags.test.js`.
5.  **`annotation-viewer-test-setup.js`**: Provides UI-specific mocks (`fetch`, `localStorage`, `sessionStorage`, `URL.createObjectURL`) needed for `AnnotationViewer` tests. This file is **imported directly** at the top of `AnnotationViewer.test.js`. It includes its own `beforeAll` and `afterEach` hooks for managing these mocks.

This approach ensures that truly global setup (timers, basic polyfills) applies everywhere via `jest.setup.js`, while specialized, potentially complex mocks (like IndexedDB, fetch) are isolated in their own files and imported only by the tests that require them. This improves clarity and reduces the chance of conflicting mocks.

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

Specific browser APIs are mocked:

- **Globally in `jest.setup.js`**: Basic `FileReader`, `JSZip`, minimal `IndexedDB` stub.
- **Specifically in `annotation-test-setup.js`**: Detailed `IndexedDB` mock (overrides the stub). Used by `AnnotationStorage.test.js` and `AnnotationTags.test.js`.
- **Specifically in `annotation-viewer-test-setup.js`**: `fetch`, `localStorage`, `sessionStorage`, `URL`. Used by `AnnotationViewer.test.js`.

## Testing Database Operations

Database testing (IndexedDB) presents challenges due to its asynchronous, event-based nature. Our approach involves:

1.  **Detailed Mock**: Using the specialized mock in `annotation-test-setup.js`, imported directly by relevant tests.
2.  **Real Timers**: Tests using the detailed `IndexedDB` mock (`AnnotationStorage`, `AnnotationTags`) run with _real timers_ (set via `jest.useRealTimers()` in `annotation-test-setup.js`) to avoid complex interactions between the mock's async simulation and Jest's fake timers.
3.  **Promise Wrapping**: Testing the promise wrappers around the IndexedDB operations in our code.
4.  **State Reset**: Mock state is reset via `jest.clearAllMocks()` in the global `afterEach` hook and potentially specific cleanup in specialized setup files.

## Best Practices

1.  **Isolation**: Keep tests focused on a single module or function.
2.  **Setup Imports**: For tests needing specialized mocks (like `AnnotationStorage`, `AnnotationViewer`), import the specific setup file directly (`import './annotation-test-setup.js';`).
3.  **Standard Mocking**: Use `jest.fn()`, `jest.spyOn()`, and Jest's matchers for all mocking and spying.
4.  **Reset State**: Rely on the global `afterEach` in `jest.setup.js` and specific hooks in specialized setups for state cleanup.
5.  **Test Helpers**: Consider creating test-specific helper functions if it significantly simplifies complex testing scenarios.
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

1.  Check that `AnnotationStorage.test.js` or `AnnotationTags.test.js` correctly imports `./annotation-test-setup.js` at the top.
2.  Remember these tests use _real timers_. Ensure async operations are awaited correctly. If timeouts still occur, consider increasing the test or hook timeout duration in the specific test file.
3.  Ensure mock state is properly reset between tests (primarily handled by `jest.clearAllMocks()` via `jest.setup.js`'s `afterEach`).

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

# Writing New Tests

Follow these guidelines to ensure consistency and maintainability when adding new tests:

1.  **File Naming & Location**: Create test files named `YourModuleName.test.js` (or `.spec.js`) directly alongside the corresponding source file (`YourModuleName.js`). Jest is configured to find these automatically.

2.  **Structure & Boilerplate**: Use nested `describe` blocks to group tests logically (e.g., by module, class, or method). Start with a basic structure:

    ```javascript
    import { yourFunction } from './YourModule.js';
    // Import necessary setup files if needed (e.g., for AnnotationViewer)
    // import './annotation-viewer-test-setup.js';

    describe('YourModule', () => {
      describe('yourFunction', () => {
        beforeEach(() => {
          // Optional: Reset specific state before each test in this block
        });

        // Rely on global afterEach in jest.setup.js for common cleanup
        // (jest.clearAllMocks, jest.clearAllTimers)

        test('should do X when Y', () => {
          // Arrange: Setup inputs, mocks, spies
          const input = /* ... */;
          const mockDependency = jest.fn(); // Or jest.spyOn(...)

          // Act: Call the code under test
          const result = yourFunction(input, mockDependency);

          // Assert: Verify the outcome and interactions
          expect(result).toBe(/* ... */);
          expect(mockDependency).toHaveBeenCalled();
        });

        test('should handle edge case Z', () => {
          // Arrange, Act, Assert for the edge case
        });

        test('should throw error for invalid input W', () => {
          // Arrange
          const invalidInput = /* ... */;
          // Act & Assert
          expect(() => yourFunction(invalidInput)).toThrow(/* ... */);
        });
      });
    });
    ```

3.  **Focus (One Behavior per Test)**: Each `test(...)` block should verify a single, specific behavior, edge case, or error condition. Avoid multiple unrelated assertions within one test.

4.  **Arrange-Act-Assert (AAA)**: Structure the body of each test clearly following the AAA pattern.

5.  **Mocks & Isolation**:

    - Use Jest's built-in mocking (`jest.fn()`, `jest.spyOn()`, `jest.mock()`) to isolate the unit under test from its dependencies (especially external ones like IndexedDB, fetch, FileReader, etc.).
    - Leverage the mocks provided by the setup files (`jest.setup.js`, `annotation-test-setup.js`, `annotation-viewer-test-setup.js`). Import specialized setup files only when necessary for the specific module being tested.

6.  **Setup & Teardown**:

    - Use `beforeEach` for setup specific to a `describe` block.
    - Rely on the global `afterEach` in `jest.setup.js` for common cleanup (`jest.clearAllMocks`, `jest.clearAllTimers`). Add specific cleanup in a local `afterEach` only if necessary (like resetting `localStorage` in `annotation-viewer-test-setup.js`).

7.  **Edge Cases & Errors**: Actively test invalid inputs, boundary conditions, and expected error scenarios using `expect(...).toThrow(...)`.

8.  **Test Types**: Focus primarily on unit tests. Use integration or snapshot tests sparingly and purposefully.

9.  **Watch Mode**: Use `npm test -- --watch` during development for rapid feedback.
