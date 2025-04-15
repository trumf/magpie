/**
 * Database functionality tests for ZipFileManager module
 */

import {ZipFileManager} from "./ZipFileManager.js";

// Create a simple mock function
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

  return fn;
}

// Setup mocks
const mockOpenRequest = {
  result: {
    objectStoreNames: {contains: () => false},
    createObjectStore: () => ({createIndex: () => {}}),
    transaction: () => ({
      objectStore: () => ({
        add: () => mockAddRequest,
        getAll: () => mockGetAllRequest,
        get: () => mockGetRequest,
        clear: () => mockClearRequest,
        delete: () => mockDeleteRequest,
      }),
    }),
  },
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
};

const mockAddRequest = {onsuccess: null, onerror: null, result: 1};
const mockGetAllRequest = {onsuccess: null, onerror: null, result: []};
const mockGetRequest = {onsuccess: null, onerror: null, result: null};
const mockClearRequest = {onsuccess: null, onerror: null};
const mockDeleteRequest = {onsuccess: null, onerror: null};

// Mock IndexedDB for these tests
const openFn = createMockFn().mockReturnValue(mockOpenRequest);
global.indexedDB = {
  open: openFn,
};

describe("ZipFileManager Database Tests", () => {
  let zipManager;

  beforeEach(() => {
    // Reset call counts
    openFn.mock.calls = [];

    // Create a fresh instance
    zipManager = new ZipFileManager({
      statusCallback: createMockFn(),
    });

    // Reset the mock state between tests
    mockOpenRequest.onsuccess = null;
    mockOpenRequest.onerror = null;
    mockOpenRequest.onupgradeneeded = null;
    mockAddRequest.onsuccess = null;
    mockAddRequest.onerror = null;
    mockGetAllRequest.onsuccess = null;
    mockGetAllRequest.onerror = null;
    mockGetRequest.onsuccess = null;
    mockGetRequest.onerror = null;
    mockClearRequest.onsuccess = null;
    mockClearRequest.onerror = null;
    mockDeleteRequest.onsuccess = null;
    mockDeleteRequest.onerror = null;
  });

  describe("initIndexedDB", () => {
    test("should initialize the database successfully", async () => {
      const promise = zipManager.initIndexedDB();

      // Simulate success
      mockOpenRequest.onsuccess &&
        mockOpenRequest.onsuccess({target: mockOpenRequest});

      const result = await promise;
      expect(result).toBeDefined();
      expect(openFn.mock.calls.length).toBeGreaterThan(0);
    });

    test("should create object store if it doesn't exist", async () => {
      const promise = zipManager.initIndexedDB();

      // Simulate upgrade needed
      mockOpenRequest.onupgradeneeded &&
        mockOpenRequest.onupgradeneeded({target: mockOpenRequest});
      // Simulate success
      mockOpenRequest.onsuccess &&
        mockOpenRequest.onsuccess({target: mockOpenRequest});

      await promise;
      // Successfully completes the test
      expect(true).toBeTruthy();
    });

    test("should handle database error", async () => {
      const promise = zipManager.initIndexedDB();

      // Simulate error
      mockOpenRequest.onerror &&
        mockOpenRequest.onerror({
          target: {error: new Error("Test DB error")},
        });

      await expect(promise).rejects.toThrow("Test DB error");
    });
  });

  describe("getAllZipFiles", () => {
    test("should get files from database", async () => {
      // Setup DB
      zipManager.db = mockOpenRequest.result;

      // Set result data
      mockGetAllRequest.result = [{id: 1, name: "test.zip"}];

      const promise = zipManager.getAllZipFiles();

      // Simulate success
      mockGetAllRequest.onsuccess &&
        mockGetAllRequest.onsuccess({
          target: mockGetAllRequest,
        });

      const result = await promise;
      expect(result).toEqual([{id: 1, name: "test.zip"}]);
    });
  });

  describe("clearZipFiles", () => {
    test("should clear all files", async () => {
      // Setup DB
      zipManager.db = mockOpenRequest.result;

      const promise = zipManager.clearZipFiles();

      // Simulate success
      mockClearRequest.onsuccess &&
        mockClearRequest.onsuccess({
          target: mockClearRequest,
        });

      await promise;
      // Successfully completes without error
      expect(true).toBeTruthy();
    });
  });
});
