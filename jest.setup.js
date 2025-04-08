import "@testing-library/jest-dom";

// Mock the IndexedDB
const indexedDB = {
  open: jest.fn(),
  deleteDatabase: jest.fn(),
};

// Mock window.matchMedia
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock the window.fs API used by the application for file access
window.fs = {
  readFile: jest.fn().mockImplementation((filepath, options) => {
    if (options && options.encoding === "utf8") {
      return Promise.resolve("mock file content");
    }
    return Promise.resolve(new Uint8Array([1, 2, 3, 4]));
  }),
};

// Mock the localStorage API
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => {
      store[key] = value.toString();
    }),
    removeItem: jest.fn((key) => {
      delete store[key];
    }),
    clear: jest.fn(() => {
      store = {};
    }),
  };
})();

Object.defineProperty(window, "localStorage", {
  value: localStorageMock,
});

// Mock the global caches API for service worker tests
global.caches = {
  open: jest.fn().mockResolvedValue({
    put: jest.fn(),
    match: jest.fn(),
    delete: jest.fn(),
    keys: jest.fn().mockResolvedValue([]),
  }),
  keys: jest.fn().mockResolvedValue([]),
  delete: jest.fn(),
};

// Mock window.showDirectoryPicker function
window.showDirectoryPicker = jest.fn();

Object.defineProperty(global, "indexedDB", {value: indexedDB});
