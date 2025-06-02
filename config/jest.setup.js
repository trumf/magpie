// Mock browser APIs that aren't available in JSDOM

// Central registry for all created mocks
global._jestMocksRegistry = [];

// Create a simple mock function that properly returns functions with chainable API
function createMockFn() {
  const mockContext = {
    calls: [],
    returnValue: undefined,
  };

  const fn = function (...args) {
    mockContext.calls.push(args);
    return mockContext.returnValue;
  };

  fn.mock = mockContext;
  fn._isMockFunction = true;

  fn.mockReturnValue = function (value) {
    mockContext.returnValue = value;
    return fn;
  };

  fn.mockImplementation = function (implementation) {
    const originalFn = fn;
    const newFn = function (...args) {
      mockContext.calls.push(args);
      return implementation(...args);
    };

    newFn.mock = mockContext;
    newFn._isMockFunction = true;
    newFn.mockReturnValue = originalFn.mockReturnValue;
    newFn.mockImplementation = originalFn.mockImplementation;

    return newFn;
  };

  fn.mockClear = function () {
    mockContext.calls = [];
    return fn;
  };

  fn.mockResolvedValue = function (value) {
    return fn.mockReturnValue(Promise.resolve(value));
  };

  fn.mockRejectedValue = function (error) {
    return fn.mockReturnValue(Promise.reject(error));
  };

  // Add the mock to the central registry
  global._jestMocksRegistry.push(fn);

  return fn;
}

// Create a global jest-like API
global.jest = {
  fn: createMockFn,

  spyOn: function (object, methodName) {
    const original = object[methodName];
    const mock = createMockFn();

    // Store the original function
    mock.originalFn = original;

    // Replace the method with our mock
    object[methodName] = mock;

    // Add mockRestore method
    mock.mockRestore = function () {
      object[methodName] = original;
    };

    mock._isMockFunction = true;

    // Add mockImplementation method
    mock.mockImplementation = function (impl) {
      object[methodName] = function (...args) {
        mock.mock.calls.push(args);
        return impl(...args);
      };
      object[methodName].mock = mock.mock;
      object[methodName].mockRestore = mock.mockRestore;
      object[methodName].mockImplementation = mock.mockImplementation;
      object[methodName].mockResolvedValue = mock.mockResolvedValue;
      object[methodName].mockRejectedValue = mock.mockRejectedValue;
      object[methodName]._isMockFunction = true;
      return object[methodName];
    };

    // Add promises support
    mock.mockResolvedValue = function (value) {
      return mock.mockImplementation(() => Promise.resolve(value));
    };

    mock.mockRejectedValue = function (error) {
      return mock.mockImplementation(() => Promise.reject(error));
    };

    // Add the spy to the central registry
    global._jestMocksRegistry.push(mock);

    return mock;
  },

  // Simple fake timers implementation
  useFakeTimers: function () {
    // Store original timer functions
    this._originalSetTimeout = global.setTimeout;
    this._originalClearTimeout = global.clearTimeout;
    this._timeouts = [];

    // Replace setTimeout
    global.setTimeout = (callback, delay) => {
      const id = this._timeouts.length;
      this._timeouts.push({callback, delay, id});
      return id;
    };

    // Replace clearTimeout
    global.clearTimeout = (id) => {
      this._timeouts = this._timeouts.filter((t) => t.id !== id);
    };
  },

  useRealTimers: function () {
    // Restore original timer functions
    if (this._originalSetTimeout) {
      global.setTimeout = this._originalSetTimeout;
      this._originalSetTimeout = null;
    }

    if (this._originalClearTimeout) {
      global.clearTimeout = this._originalClearTimeout;
      this._originalClearTimeout = null;
    }

    this._timeouts = [];
  },

  advanceTimersByTime: function (msToRun) {
    // Run all timers that should have expired
    const timerToRun = this._timeouts.filter((t) => t.delay <= msToRun);
    this._timeouts = this._timeouts.filter((t) => t.delay > msToRun);

    // Run all expired timers
    timerToRun.forEach((t) => t.callback());
  },

  // Add mock reset/restore functions
  resetAllMocks: function () {
    global._jestMocksRegistry.forEach((mock) => {
      if (mock && typeof mock.mockClear === "function") {
        mock.mockClear();
      }
    });
  },

  clearAllMocks: function () {
    // For this custom setup, clearAllMocks behaves the same as resetAllMocks
    this.resetAllMocks();
  },

  restoreAllMocks: function () {
    global._jestMocksRegistry.forEach((mock) => {
      if (mock && typeof mock.mockRestore === "function") {
        mock.mockRestore();
      }
      // Restore also clears the mock history in Jest
      if (mock && typeof mock.mockClear === "function") {
        mock.mockClear();
      }
    });
  },
};

// Mock IndexedDB
// Comment out this simpler IndexedDB mock as it conflicts with the more detailed one in annotation-test-setup.js
/*
global.indexedDB = {
  open: createMockFn(),
};
*/

// Mock FileReader
global.FileReader = function () {
  return {
    readAsArrayBuffer: createMockFn(),
    onload: null,
    onerror: null,
    result: new ArrayBuffer(8),
  };
};

// Mock JSZip
global.JSZip = function () {
  // Make JSZip function mockable
  const jsZipInstance = {
    loadAsync: createMockFn().mockReturnValue(
      Promise.resolve({
        files: {},
      })
    ),
  };

  // Add mockImplementationOnce to the JSZip constructor
  global.JSZip.mockImplementationOnce = function (implementation) {
    const originalJSZip = global.JSZip;
    const mockOnce = implementation;

    global.JSZip = function () {
      // Restore original after one call
      global.JSZip = originalJSZip;
      return mockOnce();
    };

    // Keep the mockImplementationOnce method
    global.JSZip.mockImplementationOnce = originalJSZip.mockImplementationOnce;

    return global.JSZip;
  };

  return jsZipInstance;
};

// jest.setup.js
// ---------------------------
// 1) Enable jest's built-in fake-timer API
jest.useFakeTimers();

// 2) Polyfill browser globals that JSDOM doesn't provide:

// Mock FileReader
global.FileReader = class {
  constructor() {
    this.onload = null;
    this.onerror = null;
    this.result = new ArrayBuffer(8); // Keep existing behavior
    // Define readAsArrayBuffer as a Jest mock function
    this.readAsArrayBuffer = jest.fn((_file) => {
      // Simulate async loading completion - tests can trigger this manually if needed
      // or we can add a default behavior later.
      // Example: setTimeout(() => this.onload?.({ target: { result: this.result } }), 0);
    });
  }
};

// Mock JSZip
global.JSZip = class {
  constructor() {
    this.loadAsync = jest.fn().mockResolvedValue({
      // Provide a default mock implementation returning an empty files object
      files: {},
    });
    // Add other JSZip methods as needed, mocking them with jest.fn()
  }
};

// 3) A minimal IndexedDB stub (the detailed mock is in annotation-test-setup.js)
// This basic stub prevents errors in tests that don't import the detailed mock.
global.indexedDB = {
  open: jest.fn().mockReturnValue({
    // Return a minimal request object structure
    onsuccess: null,
    onerror: null,
    onupgradeneeded: null,
    result: null, // No detailed mock DB needed here
    readyState: "done",
  }),
  deleteDatabase: jest.fn().mockReturnValue({
    onsuccess: null,
    onerror: null,
  }),
  // Add a flag to identify this basic mock (optional)
  isMock: true,
  isBasicGlobalMock: true,
};

// 4) Clean up mocks and timers after each test
afterEach(() => {
  jest.clearAllMocks();
  jest.clearAllTimers(); // Clear timers managed by jest.useFakeTimers()
});
