// This is just a basic test to verify our testing setup works
// Actual test implementation will be done later as per user's request

import {getFileStorageService} from "../FileStorageService";

// Mock IndexedDB for testing
const mockRequest = {
  result: {},
  onsuccess: null,
  onerror: null,
  onupgradeneeded: null,
  onblocked: null,
};

const mockStore = {
  getAll: jest.fn().mockReturnValue({...mockRequest}),
  get: jest.fn().mockReturnValue({...mockRequest}),
  add: jest.fn().mockReturnValue({...mockRequest}),
  put: jest.fn().mockReturnValue({...mockRequest}),
  clear: jest.fn(),
  createIndex: jest.fn(),
};

const mockTransaction = {
  objectStore: jest.fn().mockReturnValue(mockStore),
};

// Mock for database creation
const mockDb = {
  transaction: jest.fn().mockReturnValue(mockTransaction),
  objectStoreNames: {
    contains: jest.fn().mockReturnValue(true),
  },
  createObjectStore: jest.fn().mockReturnValue(mockStore),
  onerror: null,
};

// Setup and teardown
beforeEach(() => {
  // Clear all mocks
  jest.clearAllMocks();

  // Setup IndexedDB mock behavior
  global.indexedDB = {
    open: jest.fn().mockReturnValue(mockRequest),
    deleteDatabase: jest.fn().mockReturnValue({...mockRequest}),
  };

  // Set up the mock so that when onsuccess is assigned and called, it sets the expected db object
  Object.defineProperty(mockRequest, "onsuccess", {
    set(callback) {
      this._onsuccess = callback;
    },
    get() {
      return this._onsuccess;
    },
  });

  // Same for onerror
  Object.defineProperty(mockRequest, "onerror", {
    set(callback) {
      this._onerror = callback;
    },
    get() {
      return this._onerror;
    },
  });

  // Same for onupgradeneeded
  Object.defineProperty(mockRequest, "onupgradeneeded", {
    set(callback) {
      this._onupgradeneeded = callback;
    },
    get() {
      return this._onupgradeneeded;
    },
  });

  // Set the default result for successful operations
  mockRequest.result = mockDb;
});

describe("FileStorageService", () => {
  describe("initialization", () => {
    it("should initialize the database successfully", async () => {
      // Start the initialization process
      const servicePromise = getFileStorageService();

      // Simulate successful database open
      mockRequest._onsuccess({target: mockRequest});

      const service = await servicePromise;

      // Verify the service was initialized properly
      expect(service).toBeDefined();
      expect(global.indexedDB.open).toHaveBeenCalledWith("markdownDB", 2);
    });

    it("should handle database initialization errors", async () => {
      // Start the initialization process
      const servicePromise = getFileStorageService();

      // Simulate an error during database open
      mockRequest._onerror({
        target: {error: new Error("Test database error")},
      });

      // The promise should be rejected
      await expect(servicePromise).rejects.toThrow("Failed to open database");
    });

    it("should create object stores during database upgrade", async () => {
      // Start the initialization process
      getFileStorageService();

      // Simulate database upgrade needed
      mockRequest._onupgradeneeded({target: {result: mockDb}});

      // Check if the object stores were created
      expect(mockDb.objectStoreNames.contains).toHaveBeenCalledWith("files");

      // If store doesn't exist, it should be created
      mockDb.objectStoreNames.contains.mockReturnValueOnce(false);
      mockRequest._onupgradeneeded({target: {result: mockDb}});

      expect(mockDb.createObjectStore).toHaveBeenCalledWith("files", {
        keyPath: "path",
      });
      expect(mockStore.createIndex).toHaveBeenCalledTimes(3);
    });
  });

  describe("file operations", () => {
    let service;

    beforeEach(async () => {
      // Initialize service
      const servicePromise = getFileStorageService();
      mockRequest._onsuccess({target: mockRequest});
      service = await servicePromise;
    });

    it("should save files to the database", async () => {
      // Prepare test data
      const testFiles = [
        {
          path: "/test1.md",
          name: "test1.md",
          content: "Test content 1",
          type: "file",
        },
        {
          path: "/test2.md",
          name: "test2.md",
          content: "Test content 2",
          type: "file",
        },
      ];

      // Setup the mock for store operations
      mockStore.add.mockImplementation((file) => {
        const request = {...mockRequest};
        setTimeout(() => request._onsuccess(), 0);
        return request;
      });

      // Call the saveFiles method
      const savePromise = service.saveFiles(testFiles);

      // Verify store.clear was called to remove old files
      expect(mockStore.clear).toHaveBeenCalled();

      // Verify store.add was called for each file
      expect(mockStore.add).toHaveBeenCalledTimes(2);

      // Wait for the promise to resolve
      await savePromise;
    });

    it("should handle errors when saving files", async () => {
      // Prepare test data
      const testFiles = [
        {
          path: "/test1.md",
          name: "test1.md",
          content: "Test content 1",
          type: "file",
        },
      ];

      // Setup the mock for store operations to simulate an error
      mockStore.add.mockImplementation(() => {
        const request = {...mockRequest};
        setTimeout(
          () =>
            request._onerror({
              target: {error: new Error("Test error saving file")},
            }),
          0
        );
        return request;
      });

      // Call the saveFiles method and expect it to reject
      await expect(service.saveFiles(testFiles)).rejects.toThrow(
        "Failed to save file"
      );
    });

    it("should retrieve files from the database", async () => {
      // Prepare test data
      const testFiles = [
        {
          path: "/test1.md",
          name: "test1.md",
          content: "Test content 1",
          type: "file",
        },
        {
          path: "/test2.md",
          name: "test2.md",
          content: "Test content 2",
          type: "file",
        },
      ];

      // Setup the mock for getAll operation
      mockStore.getAll.mockImplementation(() => {
        const request = {...mockRequest};
        request.result = testFiles;
        setTimeout(() => request._onsuccess(), 0);
        return request;
      });

      // Call the getFiles method
      const files = await service.getFiles();

      // Verify the transaction was created
      expect(mockDb.transaction).toHaveBeenCalledWith(["files"], "readonly");

      // Verify the correct store was accessed
      expect(mockTransaction.objectStore).toHaveBeenCalledWith("files");

      // Verify getAll was called
      expect(mockStore.getAll).toHaveBeenCalled();

      // Verify the result matches what we set
      expect(files).toEqual(testFiles);
    });

    it("should handle errors when retrieving files", async () => {
      // Setup the mock for getAll operation to simulate an error
      mockStore.getAll.mockImplementation(() => {
        const request = {...mockRequest};
        setTimeout(
          () =>
            request._onerror({
              target: {error: new Error("Test error getting files")},
            }),
          0
        );
        return request;
      });

      // Call the getFiles method and expect it to reject
      await expect(service.getFiles()).rejects.toThrow("Failed to get files");
    });

    it("should update file access timestamps", async () => {
      // Mock Date.now to return a consistent timestamp for testing
      const originalDateToISOString = Date.prototype.toISOString;
      const mockTimestamp = "2023-06-15T12:00:00.000Z";
      Date.prototype.toISOString = jest.fn().mockReturnValue(mockTimestamp);

      // Prepare test data
      const testFilePath = "/test1.md";
      const testFile = {
        path: testFilePath,
        name: "test1.md",
        content: "Test content",
        lastAccessed: "2023-06-14T12:00:00.000Z",
      };

      // Setup the mock for get operation
      mockStore.get.mockImplementation(() => {
        const request = {...mockRequest};
        request.result = testFile;
        setTimeout(() => request._onsuccess(), 0);
        return request;
      });

      // Setup the mock for put operation
      mockStore.put.mockImplementation((file) => {
        // Verify the timestamp was updated
        expect(file.lastAccessed).toBe(mockTimestamp);
        return {...mockRequest};
      });

      // Call the updateFileAccess method
      await service.updateFileAccess(testFilePath);

      // Verify the transaction was created
      expect(mockDb.transaction).toHaveBeenCalledWith(["files"], "readwrite");

      // Verify get and put were called with correct parameters
      expect(mockStore.get).toHaveBeenCalledWith(testFilePath);
      expect(mockStore.put).toHaveBeenCalled();

      // Restore the original Date.toISOString
      Date.prototype.toISOString = originalDateToISOString;
    });

    it("should handle missing files during update", async () => {
      // Setup the mock for get operation to return null (file not found)
      mockStore.get.mockImplementation(() => {
        const request = {...mockRequest};
        request.result = null; // No file found
        setTimeout(() => request._onsuccess(), 0);
        return request;
      });

      // Call the updateFileAccess method
      await service.updateFileAccess("/nonexistent.md");

      // Verify get was called but put was not
      expect(mockStore.get).toHaveBeenCalled();
      expect(mockStore.put).not.toHaveBeenCalled();
    });
  });

  describe("persistence", () => {
    it("should maintain a singleton instance across multiple calls", async () => {
      // Get first instance
      mockRequest._onsuccess({target: mockRequest});
      const service1 = await getFileStorageService();

      // Reset the mock to check if open is called again
      global.indexedDB.open.mockClear();

      // Get second instance
      const service2 = await getFileStorageService();

      // Verify both instances are the same object
      expect(service2).toBe(service1);

      // Verify indexedDB.open wasn't called a second time
      expect(global.indexedDB.open).not.toHaveBeenCalled();
    });
  });
});
