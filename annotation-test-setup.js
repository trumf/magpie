/**
 * Mocks for IndexedDB to enable testing of AnnotationStorage
 */
import {jest} from "@jest/globals";

// Helper to create mock IDB requests
const createMockRequest = (resultValue, errorValue = null) => {
  const request = {
    result: resultValue,
    error: errorValue,
    onsuccess: null,
    onerror: null,
  };
  // Simulate async completion
  setTimeout(() => {
    if (errorValue) {
      request.onerror?.({target: request});
    } else {
      request.onsuccess?.({target: request});
    }
  }, 0);
  return request;
};

// Create a simple mock database for testing
class MockIDBDatabase {
  constructor(name) {
    this.name = name;
    this.objectStoreNames = {
      _stores: new Set(),
      add: function (name) {
        this._stores.add(name);
      },
      contains: function (name) {
        return this._stores.has(name);
      },
      get length() {
        return this._stores.size;
      }, // Add length property if needed
      item: function (index) {
        return Array.from(this._stores)[index];
      }, // Add item method if needed
    };
    this.objectStores = {};
    this.close = jest.fn();
    this.transaction = jest.fn((storeNames, mode) => {
      // Ensure storeNames is always an array
      const names = Array.isArray(storeNames) ? storeNames : [storeNames];
      const store = this.objectStores[names[0]]; // Simple mock: assumes first name
      return {
        objectStore: jest.fn().mockReturnValue(store),
        oncomplete: null,
        onerror: null,
        // Simulate transaction completion
        _complete: () =>
          setTimeout(() => {
            this.transaction.mock.results[
              this.transaction.mock.calls.length - 1
            ].value.oncomplete?.();
          }, 0),
      };
    });
  }

  createObjectStore(name, options) {
    const store = new MockIDBObjectStore(name, options);
    this.objectStores[name] = store;
    this.objectStoreNames.add(name);
    return store;
  }
}

class MockIDBObjectStore {
  constructor(name, options) {
    this.name = name;
    this.keyPath = options?.keyPath;
    this.autoIncrement = options?.autoIncrement || false;
    this.data = new Map(); // Use Map for easier key-based access
    this.indexes = {};
    this._nextAutoIncKey = 1;

    // Mock store methods using jest.fn and the helper
    this.put = jest.fn((value) => {
      let key = value[this.keyPath];
      if (this.autoIncrement && !key) {
        key = this._nextAutoIncKey++;
        value = {...value, [this.keyPath]: key};
      }
      if (key === undefined || key === null) {
        return createMockRequest(
          null,
          new Error(
            "Data provided to an object store must provide a key or the store must use in-line keys with autoIncrement enabled."
          )
        );
      }
      this.data.set(key, value);
      return createMockRequest(key);
    });

    this.add = jest.fn((value) => {
      let key = value[this.keyPath];
      if (this.autoIncrement && !key) {
        key = this._nextAutoIncKey++;
        value = {...value, [this.keyPath]: key};
      }
      if (key === undefined || key === null) {
        return createMockRequest(
          null,
          new Error(
            "Data provided to an object store must provide a key or the store must use in-line keys with autoIncrement enabled."
          )
        );
      }
      if (this.data.has(key)) {
        return createMockRequest(
          null,
          new Error(`ConstraintError: Key ${key} already exists`)
        );
      }
      this.data.set(key, value);
      return createMockRequest(key);
    });

    this.get = jest.fn((key) => {
      const result = this.data.get(key);
      return createMockRequest(result);
    });

    this.getAll = jest.fn((query) => {
      // Basic getAll, doesn't handle query ranges yet
      const result = Array.from(this.data.values());
      return createMockRequest(result);
    });

    this.delete = jest.fn((key) => {
      this.data.delete(key);
      return createMockRequest(undefined);
    });

    this.clear = jest.fn(() => {
      this.data.clear();
      this._nextAutoIncKey = 1;
      return createMockRequest(undefined);
    });

    this.createIndex = jest.fn((name, keyPath, options) => {
      this.indexes[name] = {keyPath, options};
      // Return a mock index object - functionality TBD if needed
      const mockIndex = {
        name: name,
        keyPath: keyPath,
        multiEntry: options?.multiEntry || false,
        unique: options?.unique || false,
        objectStore: this,
        openCursor: jest.fn(),
        openKeyCursor: jest.fn(),
        get: jest.fn((key) => {
          // Simplified get for index
          for (const item of this.data.values()) {
            if (item[keyPath] === key) {
              return createMockRequest(item);
            }
          }
          return createMockRequest(undefined);
        }),
        getKey: jest.fn((key) => {
          // Simplified getKey for index
          for (const [itemKey, item] of this.data.entries()) {
            if (item[keyPath] === key) {
              return createMockRequest(itemKey);
            }
          }
          return createMockRequest(undefined);
        }),
        getAll: jest.fn((key) => {
          // Simplified getAll for index
          const results = [];
          for (const item of this.data.values()) {
            if (item[keyPath] === key) {
              results.push(item);
            }
          }
          return createMockRequest(results);
        }),
        getAllKeys: jest.fn((key) => {
          // Simplified getAllKeys for index
          const results = [];
          for (const [itemKey, item] of this.data.entries()) {
            if (item[keyPath] === key) {
              results.push(itemKey);
            }
          }
          return createMockRequest(results);
        }),
        count: jest.fn((key) => {
          // Simplified count for index
          let count = 0;
          for (const item of this.data.values()) {
            if (item[keyPath] === key) {
              count++;
            }
          }
          return createMockRequest(count);
        }),
      };
      return mockIndex;
    });

    this.index = jest.fn((name) => {
      return this.indexes[name]; // Return the created mock index
    });
  }
}

// Mock indexedDB global object
global.indexedDB = {
  databases: {},
  open: jest.fn((name, version) => {
    const request = {
      result: null,
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
      transaction: null, // Transactions aren't directly on requests
      readyState: "pending",
    };

    setTimeout(() => {
      // Check if DB exists, simulate upgrade if needed
      let db = this.databases[name];
      let upgradeNeeded = false;
      if (!db || (version && db.version < version)) {
        upgradeNeeded = true;
        db = new MockIDBDatabase(name);
        db.version = version;
        this.databases[name] = db;
      }

      request.result = db;
      request.readyState = "done";

      // Trigger onupgradeneeded if necessary
      if (upgradeNeeded && request.onupgradeneeded) {
        // In IndexedDB, the transaction is provided on the event
        const upgradeTransaction = db.transaction([], "versionchange"); // Create a dummy transaction
        request.transaction = upgradeTransaction; // Attach to request temporarily for event
        request.onupgradeneeded({target: request});
        request.transaction = null; // Clean up
        // Simulate transaction completion for upgrade
        upgradeTransaction._complete();

        // After upgrade, trigger success
        // Need another timeout to ensure upgrade finishes before success
        setTimeout(() => {
          request.onsuccess?.({target: request});
        }, 0);
      } else if (request.onsuccess) {
        // Otherwise, just trigger success
        request.onsuccess?.({target: request});
      }
    }, 0);

    return request;
  }),
  deleteDatabase: jest.fn((name) => {
    delete this.databases?.[name];
    return createMockRequest(undefined);
  }),
  // Add a flag to identify this mock to prevent jest.setup.js from overwriting it
  isMock: true,
  isDetailedMock: true,
};
