/**
 * indexedDBManager.test.js
 * Tests for the IndexedDB Manager module
 */

import {
  initIndexedDB,
  saveZipData,
  getAllZipFiles,
  getZipFileById,
  updateZipFile,
  clearZipFiles,
  deleteZipFile,
} from "./indexedDBManager.js";

// Mock IndexedDB implementations
global.indexedDB = {
  open: jest.fn(),
};

// Sample data
const sampleZipData = {
  name: "test.zip",
  size: 1024,
  timestamp: new Date().toISOString(),
  fileCount: 2,
  totalSize: 1024,
  files: [
    {path: "test1.md", content: "# Test 1", size: 512},
    {path: "test2.md", content: "# Test 2", size: 512},
  ],
};

describe("IndexedDB Manager Module", () => {
  let mockDb;
  let mockRequest;
  let mockTransaction;
  let mockObjectStore;

  beforeEach(() => {
    // Reset all mocks
    jest.resetAllMocks();

    // Helper to create mock IDBRequest
    const createMockIdbRequest = (resultValue = null) => {
      const req = {result: resultValue, onsuccess: null, onerror: null};
      // Simulate async success by default
      setTimeout(() => {
        if (req.onsuccess) req.onsuccess({target: req});
      }, 0);
      return req;
    };

    // Setup mock indexedDB database
    mockObjectStore = {
      add: jest.fn().mockImplementation(() => createMockIdbRequest(1)), // Default result ID 1
      put: jest
        .fn()
        .mockImplementation((data) => createMockIdbRequest(data.id || 1)), // Default result is object id
      get: jest.fn().mockImplementation(() => createMockIdbRequest()), // Default result null
      getAll: jest.fn().mockImplementation(() => createMockIdbRequest([])), // Default result empty array
      delete: jest.fn().mockImplementation(() => createMockIdbRequest()),
      clear: jest.fn().mockImplementation(() => createMockIdbRequest()),
      createIndex: jest.fn(),
    };

    mockTransaction = {
      objectStore: jest.fn().mockReturnValue(mockObjectStore),
    };

    mockDb = {
      transaction: jest.fn().mockReturnValue(mockTransaction),
      objectStoreNames: {
        contains: jest.fn().mockReturnValue(false),
      },
      createObjectStore: jest.fn().mockReturnValue(mockObjectStore),
    };

    mockRequest = {
      result: mockDb,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };

    global.indexedDB.open.mockReturnValue(mockRequest);
  });

  describe("initIndexedDB", () => {
    it("should open the database with correct parameters", async () => {
      const initPromise = initIndexedDB();

      // Simulate successful database open
      mockRequest.onsuccess({target: mockRequest});

      await initPromise;

      expect(global.indexedDB.open).toHaveBeenCalledWith("ZipFileDB", 1);
    });

    it("should create object store during upgrade if needed", async () => {
      const initPromise = initIndexedDB();

      // Simulate upgrade needed event
      mockRequest.onupgradeneeded({target: mockRequest});

      // Then simulate successful opening
      mockRequest.onsuccess({target: mockRequest});

      await initPromise;

      expect(mockDb.createObjectStore).toHaveBeenCalledWith("zipFiles", {
        keyPath: "id",
        autoIncrement: true,
      });
    });

    it("should handle errors when opening the database", async () => {
      const initPromise = initIndexedDB();

      // Simulate error
      mockRequest.onerror({
        target: {
          error: new Error("Test error"),
        },
      });

      await expect(initPromise).rejects.toThrow("Test error");
    });
  });

  describe("saveZipData", () => {
    it("should save zip data to the database", async () => {
      // Initialize DB first (normally handled by saveZipData)
      const dbPromise = initIndexedDB();
      mockRequest.onsuccess({target: mockRequest});
      const db = await dbPromise;

      // Now test saveZipData
      const id = await saveZipData(sampleZipData, {}, db);

      expect(id).toBe(1);
      expect(mockDb.transaction).toHaveBeenCalledWith(
        ["zipFiles"],
        "readwrite"
      );
      expect(mockObjectStore.add).toHaveBeenCalledWith(sampleZipData);
    });
  });

  describe("getAllZipFiles", () => {
    it("should retrieve all zip files", async () => {
      const mockData = [sampleZipData];

      // Initialize DB first
      const dbPromise = initIndexedDB();
      mockRequest.onsuccess({target: mockRequest});
      const db = await dbPromise;

      // Configure the default mock request to return specific data for this test
      mockObjectStore.getAll.mockImplementationOnce(() => {
        const req = {result: mockData, onsuccess: null, onerror: null};
        setTimeout(() => {
          if (req.onsuccess) req.onsuccess({target: req});
        }, 0);
        return req;
      });

      // Test getAllZipFiles
      const result = await getAllZipFiles({}, db);

      expect(result).toEqual(mockData);
      expect(mockDb.transaction).toHaveBeenCalledWith(["zipFiles"], "readonly");
      expect(mockObjectStore.getAll).toHaveBeenCalled();
    });
  });

  describe("getZipFileById", () => {
    it("should retrieve a specific zip file by ID", async () => {
      const zipId = 1;
      const retrievedData = {...sampleZipData, id: zipId};

      // Initialize DB first
      const dbPromise = initIndexedDB();
      mockRequest.onsuccess({target: mockRequest});
      const db = await dbPromise;

      // Configure the default mock request to return specific data for this test
      mockObjectStore.get.mockImplementationOnce((id) => {
        const req = {
          result: id === zipId ? retrievedData : undefined,
          onsuccess: null,
          onerror: null,
        };
        setTimeout(() => {
          if (req.onsuccess) req.onsuccess({target: req});
        }, 0);
        return req;
      });

      // Test getZipFileById
      const result = await getZipFileById(zipId, {}, db);

      expect(result).toEqual(retrievedData);
      expect(mockDb.transaction).toHaveBeenCalledWith(["zipFiles"], "readonly");
      expect(mockObjectStore.get).toHaveBeenCalledWith(zipId);
    });

    it("should reject if the file is not found", async () => {
      const zipId = 999;

      // Initialize DB first
      const dbPromise = initIndexedDB();
      mockRequest.onsuccess({target: mockRequest});
      const db = await dbPromise;

      // Configure the default mock request to return undefined for this test
      mockObjectStore.get.mockImplementationOnce(() => {
        const req = {result: undefined, onsuccess: null, onerror: null};
        setTimeout(() => {
          if (req.onsuccess) req.onsuccess({target: req});
        }, 0);
        return req;
      });

      // Test getZipFileById with non-existent ID
      await expect(getZipFileById(zipId, {}, db)).rejects.toThrow(
        `ZIP file with ID ${zipId} not found`
      );
    });
  });

  describe("updateZipFile", () => {
    it("should update an existing zip file", async () => {
      const zipData = {...sampleZipData, id: 1};

      // Initialize DB first
      const dbPromise = initIndexedDB();
      mockRequest.onsuccess({target: mockRequest});
      const db = await dbPromise;

      // Configure the default mock request if needed (e.g., return specific ID)
      mockObjectStore.put.mockImplementationOnce((data) => {
        const req = {result: data.id, onsuccess: null, onerror: null};
        setTimeout(() => {
          if (req.onsuccess) req.onsuccess({target: req});
        }, 0);
        return req;
      });

      // Test updateZipFile
      const result = await updateZipFile(zipData, {}, db);

      expect(result).toBe(1);
      expect(mockDb.transaction).toHaveBeenCalledWith(
        ["zipFiles"],
        "readwrite"
      );
      expect(mockObjectStore.put).toHaveBeenCalledWith(zipData);
    });
  });

  describe("deleteZipFile", () => {
    it("should delete a zip file by ID", async () => {
      const zipId = 1;

      // Initialize DB first
      const dbPromise = initIndexedDB();
      mockRequest.onsuccess({target: mockRequest});
      const db = await dbPromise;

      // Test deleteZipFile
      await deleteZipFile(zipId, {}, db);

      expect(mockDb.transaction).toHaveBeenCalledWith(
        ["zipFiles"],
        "readwrite"
      );
      expect(mockObjectStore.delete).toHaveBeenCalledWith(zipId);
    });
  });

  describe("clearZipFiles", () => {
    it("should clear all zip files", async () => {
      // Initialize DB first
      const dbPromise = initIndexedDB();
      mockRequest.onsuccess({target: mockRequest});
      const db = await dbPromise;

      // Test clearZipFiles
      await clearZipFiles({}, db);

      expect(mockDb.transaction).toHaveBeenCalledWith(
        ["zipFiles"],
        "readwrite"
      );
      expect(mockObjectStore.clear).toHaveBeenCalled();
    });
  });
});
