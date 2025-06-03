// Setup for AnnotationViewer tests
import "../../../jest.setup.js";
import {jest} from "@jest/globals";

// Additional setup specific to annotation viewer tests
global.window.fetch = jest.fn().mockImplementation(() => {
  return Promise.resolve({
    ok: true,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(""),
  });
});

// Mock localStorage and sessionStorage
const localStorageMock = (function () {
  let store = {};
  return {
    getItem: function (key) {
      return store[key] || null;
    },
    setItem: function (key, value) {
      store[key] = value.toString();
    },
    clear: function () {
      store = {};
    },
    removeItem: function (key) {
      delete store[key];
    },
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

Object.defineProperty(window, "sessionStorage", {
  value: localStorageMock,
});

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => "blob:mock-url");
global.URL.revokeObjectURL = jest.fn();

// Clean up mocks after each test
afterEach(() => {
  // Clear fetch and URL mocks
  jest.clearAllMocks();
  // Reset localStorage/sessionStorage if needed for test isolation
  localStorageMock.clear();
});
