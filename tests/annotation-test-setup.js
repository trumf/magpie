/**
 * Mocks for IndexedDB to enable testing of AnnotationStorage
 */
import {jest} from "@jest/globals";

// --- Use Real Timers for these tests ---
// Override the global fake timers from jest.setup.js because the async
// nature of the IndexedDB mock interacts poorly with fake timers, causing timeouts.
jest.useRealTimers();
// ---------------------------------------

// Wrap the detailed mock setup in beforeAll
beforeAll(() => {
  // Helper to create mock IDB requests
  const createMockRequest = (resultValue, errorValue = null) => {
    const request = {
      result: resultValue,
      error: errorValue,
      onsuccess: null,
      onerror: null,
    };
    // Simulate async completion (using real setTimeout because of useRealTimers)
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
        const tx = {
          objectStore: jest.fn().mockReturnValue(store),
          oncomplete: null,
          onerror: null,
          // Simulate transaction completion
          _complete: () =>
            setTimeout(() => {
              tx.oncomplete?.();
            }, 0),
          abort: jest.fn(() => {
            setTimeout(() => {
              tx.onerror?.(new Error("Transaction aborted"));
            }, 0);
          }),
        };
        return tx;
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
        const indexData = {
          keyPath,
          options,
          name,
          objectStore: this,
          multiEntry: options?.multiEntry || false,
          unique: options?.unique || false,
        };
        this.indexes[name] = {
          ...indexData,
          // Mock index methods using jest.fn and createMockRequest
          openCursor: jest.fn(/* ... implementation ... */),
          openKeyCursor: jest.fn(/* ... implementation ... */),
          get: jest.fn((key) => {
            for (const item of this.data.values()) {
              // Basic key check, doesn't handle multiEntry correctly
              if (item[keyPath] === key) {
                return createMockRequest(item);
              }
            }
            return createMockRequest(undefined);
          }),
          getKey: jest.fn((key) => {
            for (const [itemKey, item] of this.data.entries()) {
              if (item[keyPath] === key) {
                return createMockRequest(itemKey);
              }
            }
            return createMockRequest(undefined);
          }),
          getAll: jest.fn((key) => {
            const results = [];
            for (const item of this.data.values()) {
              // Basic key check, doesn't handle multiEntry or ranges
              if (key === undefined || item[keyPath] === key) {
                results.push(item);
              }
            }
            return createMockRequest(results);
          }),
          getAllKeys: jest.fn((key) => {
            const results = [];
            for (const [itemKey, item] of this.data.entries()) {
              if (key === undefined || item[keyPath] === key) {
                results.push(itemKey);
              }
            }
            return createMockRequest(results);
          }),
          count: jest.fn((key) => {
            let count = 0;
            for (const item of this.data.values()) {
              if (key === undefined || item[keyPath] === key) {
                count++;
              }
            }
            return createMockRequest(count);
          }),
        };
        return this.indexes[name];
      });

      this.index = jest.fn((name) => {
        if (!this.indexes[name]) {
          throw new Error(
            `NotFoundError: No index named ${name} found in the specified object store`
          );
        }
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

      // Use real setTimeout here
      setTimeout(() => {
        let db = global.indexedDB.databases[name]; // Use global.indexedDB consistently
        let upgradeNeeded = false;
        if (!db || (version && db.version < version)) {
          upgradeNeeded = true;
          db = new MockIDBDatabase(name);
          db.version = version;
          global.indexedDB.databases[name] = db;
        }

        request.result = db;
        request.readyState = "done";

        if (upgradeNeeded && request.onupgradeneeded) {
          const upgradeTransaction = db.transaction([], "versionchange");
          request.transaction = upgradeTransaction;
          request.onupgradeneeded({target: request});
          request.transaction = null;
          upgradeTransaction._complete();

          setTimeout(() => {
            request.onsuccess?.({target: request});
          }, 0);
        } else if (request.onsuccess) {
          request.onsuccess?.({target: request});
        }
      }, 0);

      return request;
    }),
    deleteDatabase: jest.fn((name) => {
      delete global.indexedDB.databases?.[name]; // Use global.indexedDB consistently
      return createMockRequest(undefined);
    }),
    isMock: true,
    isDetailedMock: true,
  };
}); // Close beforeAll wrapper

// Optional: Add afterEach to clear the mock DB state if needed
/*
afterEach(() => {
  if (global.indexedDB && global.indexedDB.databases) {
    global.indexedDB.databases = {};
  }
});
*/
