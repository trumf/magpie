// Mock browser APIs that aren't available in JSDOM

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
      return object[methodName];
    };

    // Add promises support
    mock.mockResolvedValue = function (value) {
      return mock.mockImplementation(() => Promise.resolve(value));
    };

    mock.mockRejectedValue = function (error) {
      return mock.mockImplementation(() => Promise.reject(error));
    };

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
