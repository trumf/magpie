// Tests for IndexedDB persistence across page refreshes

import {getFileStorageService} from "../FileStorageService";

// Mock IndexedDB
const setupMockIndexedDB = () => {
  // Mock database storage
  let dbData = {
    files: [],
  };

  // Mock request object
  const createMockRequest = () => ({
    result: null,
    error: null,
    _onsuccess: null,
    _onerror: null,
    _onupgradeneeded: null,
    _onblocked: null,
    get onsuccess() {
      return this._onsuccess;
    },
    set onsuccess(fn) {
      this._onsuccess = fn;
    },
    get onerror() {
      return this._onerror;
    },
    set onerror(fn) {
      this._onerror = fn;
    },
    get onupgradeneeded() {
      return this._onupgradeneeded;
    },
    set onupgradeneeded(fn) {
      this._onupgradeneeded = fn;
    },
    get onblocked() {
      return this._onblocked;
    },
    set onblocked(fn) {
      this._onblocked = fn;
    },
    // Helper to trigger success
    triggerSuccess(result = null) {
      this.result = result;
      if (this._onsuccess) this._onsuccess({target: this});
    },
    // Helper to trigger error
    triggerError(error = new Error("Generic error")) {
      this.error = error;
      if (this._onerror) this._onerror({target: {error}});
    },
  });

  // Mock transaction
  const mockTransaction = {
    objectStore: (storeName) => {
      // Return object store operations
      return {
        getAll: () => {
          const request = createMockRequest();
          setTimeout(() => {
            if (dbData[storeName]) {
              request.triggerSuccess(dbData[storeName]);
            } else {
              request.triggerError(new Error(`Store ${storeName} not found`));
            }
          }, 0);
          return request;
        },
        get: (key) => {
          const request = createMockRequest();
          setTimeout(() => {
            if (dbData[storeName]) {
              const item = dbData[storeName].find((item) => item.path === key);
              request.triggerSuccess(item || null);
            } else {
              request.triggerError(new Error(`Store ${storeName} not found`));
            }
          }, 0);
          return request;
        },
        add: (item) => {
          const request = createMockRequest();
          setTimeout(() => {
            if (dbData[storeName]) {
              // Check if item already exists
              const existingItemIndex = dbData[storeName].findIndex(
                (i) => i.path === item.path
              );
              if (existingItemIndex >= 0) {
                request.triggerError(
                  new Error(`Item with key ${item.path} already exists`)
                );
              } else {
                dbData[storeName].push(item);
                request.triggerSuccess();
              }
            } else {
              request.triggerError(new Error(`Store ${storeName} not found`));
            }
          }, 0);
          return request;
        },
        put: (item) => {
          const request = createMockRequest();
          setTimeout(() => {
            if (dbData[storeName]) {
              const existingItemIndex = dbData[storeName].findIndex(
                (i) => i.path === item.path
              );
              if (existingItemIndex >= 0) {
                dbData[storeName][existingItemIndex] = item;
              } else {
                dbData[storeName].push(item);
              }
              request.triggerSuccess();
            } else {
              request.triggerError(new Error(`Store ${storeName} not found`));
            }
          }, 0);
          return request;
        },
        clear: () => {
          const request = createMockRequest();
          setTimeout(() => {
            if (dbData[storeName]) {
              dbData[storeName] = [];
              request.triggerSuccess();
            } else {
              request.triggerError(new Error(`Store ${storeName} not found`));
            }
          }, 0);
          return request;
        },
        createIndex: jest.fn(),
      };
    },
  };

  // Mock database
  const mockDB = {
    transaction: (storeNames, mode) => mockTransaction,
    objectStoreNames: {
      contains: (name) => Boolean(dbData[name]),
    },
    createObjectStore: (name, options) => {
      dbData[name] = [];
      return mockTransaction.objectStore(name);
    },
    close: jest.fn(),
  };

  // Save original indexedDB for cleanup
  const originalIndexedDB = global.indexedDB;

  // Mock IndexedDB
  global.indexedDB = {
    open: (dbName, version) => {
      const request = createMockRequest();

      // Simulate database opening
      setTimeout(() => {
        // First trigger upgradeneeded if appropriate
        if (request._onupgradeneeded) {
          request.result = mockDB;
          request._onupgradeneeded({target: request});
        }

        // Then trigger success
        request.result = mockDB;
        request.triggerSuccess(mockDB);
      }, 0);

      return request;
    },
    deleteDatabase: (dbName) => {
      const request = createMockRequest();
      setTimeout(() => {
        // Clear all data
        Object.keys(dbData).forEach((key) => {
          dbData[key] = [];
        });
        request.triggerSuccess();
      }, 0);
      return request;
    },
  };

  // Return functions to manipulate the mock data directly for testing
  return {
    getData: () => dbData,
    setData: (newData) => {
      dbData = newData;
    },
    clearData: () => {
      dbData = {files: []};
    },
    cleanup: () => {
      global.indexedDB = originalIndexedDB;
    },
  };
};

describe("IndexedDB Persistence Tests", () => {
  let mockDBControls;

  beforeEach(() => {
    jest.resetModules(); // Clear cache for singleton pattern
    mockDBControls = setupMockIndexedDB();
    mockDBControls.clearData(); // Start fresh
  });

  afterEach(() => {
    mockDBControls.cleanup(); // Restore original indexedDB
  });

  it("should save files and be able to retrieve them later", async () => {
    // Get service instance (first time initialization)
    const service1 = await getFileStorageService();

    // Prepare test files
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

    // Save files (simulating initial import)
    await service1.saveFiles(testFiles);

    // Verify files were saved to "database"
    expect(mockDBControls.getData().files.length).toBe(2);
    expect(mockDBControls.getData().files[0].name).toBe("test1.md");
    expect(mockDBControls.getData().files[1].name).toBe("test2.md");

    // Now simulate a page refresh by getting a new instance
    // (This forces re-initialization but the data should still be there)
    jest.resetModules();
    const getServiceAgain =
      require("../FileStorageService").getFileStorageService;
    const service2 = await getServiceAgain();

    // Retrieve files
    const retrievedFiles = await service2.getFiles();

    // Verify we got the same files back
    expect(retrievedFiles.length).toBe(2);
    expect(retrievedFiles[0].path).toBe("/test1.md");
    expect(retrievedFiles[0].content).toBe("Test content 1");
    expect(retrievedFiles[1].path).toBe("/test2.md");
    expect(retrievedFiles[1].content).toBe("Test content 2");
  });

  it("should maintain last accessed file info after refresh", async () => {
    // Setup test data
    const testFiles = [
      {path: "/file1.md", name: "file1.md", content: "Content 1", type: "file"},
      {path: "/file2.md", name: "file2.md", content: "Content 2", type: "file"},
    ];

    // First service instance - save files
    const service1 = await getFileStorageService();
    await service1.saveFiles(testFiles);

    // Update last accessed for file2
    await service1.updateFileAccess("/file2.md");

    // Get the database data directly to verify
    const dbData = mockDBControls.getData();
    const file2Data = dbData.files.find((f) => f.path === "/file2.md");

    // Remember the timestamp
    const lastAccessedTimestamp = file2Data.lastAccessed;
    expect(lastAccessedTimestamp).toBeDefined();

    // Simulate page refresh - get a new instance
    jest.resetModules();
    const getServiceAgain =
      require("../FileStorageService").getFileStorageService;
    const service2 = await getServiceAgain();

    // Get the files again
    const filesAfterRefresh = await service2.getFiles();

    // Verify the last accessed timestamp was preserved
    const file2AfterRefresh = filesAfterRefresh.find(
      (f) => f.path === "/file2.md"
    );
    expect(file2AfterRefresh.lastAccessed).toBe(lastAccessedTimestamp);
  });

  it("should clear old files when new ones are imported", async () => {
    // Setup initial files
    const initialFiles = [
      {
        path: "/old1.md",
        name: "old1.md",
        content: "Old content 1",
        type: "file",
      },
      {
        path: "/old2.md",
        name: "old2.md",
        content: "Old content 2",
        type: "file",
      },
    ];

    // First service instance - save initial files
    const service = await getFileStorageService();
    await service.saveFiles(initialFiles);

    // Verify initial state
    expect(mockDBControls.getData().files.length).toBe(2);

    // New files to import
    const newFiles = [
      {
        path: "/new1.md",
        name: "new1.md",
        content: "New content 1",
        type: "file",
      },
      {
        path: "/new2.md",
        name: "new2.md",
        content: "New content 2",
        type: "file",
      },
      {
        path: "/new3.md",
        name: "new3.md",
        content: "New content 3",
        type: "file",
      },
    ];

    // Save new files (this should replace all old ones)
    await service.saveFiles(newFiles);

    // Verify new state
    const dbData = mockDBControls.getData();
    expect(dbData.files.length).toBe(3);

    // Check old files are gone
    const hasOldFiles = dbData.files.some((f) => f.path.startsWith("/old"));
    expect(hasOldFiles).toBe(false);

    // Check new files are there
    const newFileCount = dbData.files.filter((f) =>
      f.path.startsWith("/new")
    ).length;
    expect(newFileCount).toBe(3);
  });

  it("should handle errors during file retrieval gracefully", async () => {
    // Setup test data
    const testFiles = [
      {path: "/file1.md", name: "file1.md", content: "Content 1", type: "file"},
    ];

    // Save files
    const service = await getFileStorageService();
    await service.saveFiles(testFiles);

    // Corrupt database by setting files to undefined
    mockDBControls.setData({files: undefined});

    // Attempt to get files - should throw an error
    await expect(service.getFiles()).rejects.toThrow("Failed to get files");
  });
});
