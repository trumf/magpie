# Testing ZipFileManager

This document outlines our approach to testing the ZipFileManager module, which uses browser APIs like IndexedDB and FileReader that require special handling in a test environment.

## Test Organization

We've organized the tests into multiple focused test files to achieve better isolation and maintainability:

1. **basic.test.js** - Sanity test to verify Jest is working properly
2. **ZipFileManager.simple.test.js** - Tests simple utility functions that don't require mocking
3. **ZipFileManager.core.test.js** - Tests core functions including formatSize, showStatus, and HTML generation
4. **ZipFileManager.db.test.js** - Tests database operations with controlled mocking
5. **ZipFileManager.ReadStatus.test.js** - Tests read/unread state functionality using Node.js test runner
6. **AnnotationStorage.test.js** - Tests annotation storage with specialized IndexedDB mocks
7. **AnnotationViewer.test.js** - Tests annotation viewer with UI component mocking
8. **HeadlineExtraction.test.js** - Tests headline extraction from markdown content

## Module System Requirements

Our project uses ES modules exclusively. This has important implications for testing:

### ES Modules vs CommonJS

- **Package Configuration**: Our package.json includes `"type": "module"`, making ES modules the default.
- **Import Syntax**: All files (including tests) must use `import`/`export` syntax, not CommonJS `require`.
- **Mocking Challenges**: Jest's mocking system was originally designed for CommonJS and has some limitations with ES modules.

### Testing Policies for ES Modules

1. **Always use import/export syntax**: Never use `require()` in any test or production code.
2. **Mock imports correctly**: Use `jest.mock()` without the `{virtual: true}` option for ES modules.
3. **Alternative for complex cases**: Use Node.js built-in test runner for tests that have complex module dependencies.

## Test Setup Organization

We use multiple test setup files to properly isolate test environments:

1. **jest.setup.js**: Base setup with mock implementations for browser APIs

   - Creates mock functions that mimic Jest's mocking API
   - Provides basic mocks for IndexedDB, FileReader, JSZip, etc.

2. **annotation-test-setup.js**: Enhanced IndexedDB mocking for annotation tests

   - Provides a more detailed IndexedDB implementation
   - Simulates object stores, indexes, and transactions

3. **annotation-viewer-test-setup.js**: UI-specific mocks
   - Mocks `fetch`, `localStorage`, and `sessionStorage`
   - Mocks URL handling functions

## Testing Approaches

### 1. Jest with JSDOM

The primary testing approach uses Jest with the JSDOM environment:

```
npm test
```

### 2. Node.js Test Runner

For tests that struggle with Jest's ES module handling, we use Node.js built-in test runner:

```
npm run test:readstatus
```

Benefits of Node.js test runner:

- Native ES module support
- No configuration needed
- Simple assertion API

## Mocking Approach

Since we're testing code that uses browser APIs not available in Jest's JSDOM environment, we needed to create custom mocks:

### 1. Mock Implementation

We created a custom mock function implementation (`createMockFn()`) that mimics Jest's mock functionality:

- Tracks function calls
- Supports chaining (mockReturnValue)
- Maintains call history

### 2. Global Jest API

We added a custom implementation of Jest's mocking API to the global object to ensure compatibility:

- `jest.fn()` - Creates mock functions
- `jest.spyOn()` - Creates spies on object methods
- `jest.useFakeTimers()` - Replaces setTimeout/clearTimeout
- `jest.advanceTimersByTime()` - Simulates time passing

### 3. Browser API Mocks

We mocked several browser APIs:

- **IndexedDB** - Mocked the `open` method and related request objects
- **FileReader** - Mocked the constructor and methods
- **JSZip** - Mocked the library's API

## Testing Database Operations

Database testing presented the most challenges:

1. **Event-based API** - IndexedDB uses events (success, error, upgradeneeded) which required special handling
2. **Promises** - Our module wraps these events in promises
3. **Mock Consistency** - We needed to maintain consistent mock behavior across tests

Our approach:

- Create mock request objects with controlled behavior
- Manually trigger events in tests to simulate API behavior
- Reset mock state between tests

## Best Practices

1. **Isolation is key** - Separating tests by dependency complexity makes debugging easier
2. **Progressive enhancement** - Start with simple tests and add complexity gradually
3. **Custom mocking** - Build our own mocking infrastructure for browser APIs when needed
4. **Reset state** - Ensure mock objects are reset between tests
5. **Test helpers** - Create test-specific helper methods in production code when necessary
6. **Avoid database dependencies** - Use direct state manipulation for simple tests
7. **Use appropriate test runner** - Choose Jest or Node.js test runner based on module complexity

## Troubleshooting Common Issues

### "require is not defined" Error

This error occurs when trying to use CommonJS in an ES module environment:

```
SyntaxError: Cannot use import statement outside a module
```

**Solutions:**

1. Convert CommonJS `require()` to ES module `import` syntax
2. For Jest mocks with complex dependencies, use Node.js test runner instead
3. Never use `{virtual: true}` option with `jest.mock()` in ES module context

### IndexedDB Mocking Issues

If tests involving IndexedDB fail with unexpected behaviors:

1. Check if the appropriate test setup file is being used
2. Verify that mock state is properly reset between tests
3. Consider adding test-specific helper methods to simplify testing

## Running Tests

To run all Jest tests:

```
npm test
```

To run specific test files with Jest:

```
npm test -- ZipFileManager.core.test.js
```

To run Node.js tests:

```
npm run test:readstatus
```
