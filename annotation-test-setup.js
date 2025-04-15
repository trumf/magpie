/**
 * Mocks for IndexedDB to enable testing of AnnotationStorage
 */
import {jest} from "@jest/globals";

// Create a simple mock database for testing
class MockIDBDatabase {
  constructor(name) {
    this.name = name;
    this.objectStoreNames = {
      contains: (name) => false,
    };
    this.objectStores = {};
  }

  createObjectStore(name, options) {
    const store = new MockIDBObjectStore(name, options);
    this.objectStores[name] = store;
    this.objectStoreNames.contains = (storeName) =>
      storeName === name || Object.keys(this.objectStores).includes(storeName);
    return store;
  }

  transaction(storeNames, mode) {
    return {
      objectStore: (name) => this.objectStores[name],
    };
  }

  close() {
    // Mock implementation
  }
}

class MockIDBObjectStore {
  constructor(name, options) {
    this.name = name;
    this.keyPath = options?.keyPath;
    this.autoIncrement = options?.autoIncrement || false;
    this.data = {};
    this.indexes = {};
  }

  createIndex(name, keyPath, options) {
    this.indexes[name] = {keyPath, options};
    return {
      getAll: (key) => {
        return {
          onsuccess: null,
          onerror: null,
          set result(value) {},
          get result() {
            return Object.values(this.data).filter(
              (item) => item[keyPath] === key
            );
          },
        };
      },
    };
  }

  index(name) {
    return {
      getAll: (key) => {
        const request = {
          result: Object.values(this.data).filter(
            (item) => item[this.indexes[name].keyPath] === key
          ),
        };

        setTimeout(() => {
          if (request.onsuccess) {
            request.onsuccess({target: request});
          }
        }, 0);

        return request;
      },
    };
  }

  put(value) {
    const id = value.id || Date.now().toString();
    this.data[id] = {...value, id};

    const request = {};

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({target: {result: id}});
      }
    }, 0);

    return request;
  }

  get(id) {
    const request = {
      result: this.data[id] || null,
    };

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({target: request});
      }
    }, 0);

    return request;
  }

  getAll() {
    const request = {
      result: Object.values(this.data),
    };

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({target: request});
      }
    }, 0);

    return request;
  }

  delete(id) {
    delete this.data[id];

    const request = {};

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({target: {result: undefined}});
      }
    }, 0);

    return request;
  }

  clear() {
    this.data = {};

    const request = {};

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({target: {result: undefined}});
      }
    }, 0);

    return request;
  }
}

// Mock indexedDB global object
const mockIndexedDB = {
  databases: {},

  open(name, version) {
    const request = {
      readyState: "pending",
    };

    setTimeout(() => {
      const db = new MockIDBDatabase(name);
      this.databases[name] = db;

      if (request.onupgradeneeded) {
        request.onupgradeneeded({target: {result: db}});
      }

      request.readyState = "done";

      if (request.onsuccess) {
        request.onsuccess({target: {result: db}});
      }
    }, 0);

    return request;
  },

  deleteDatabase(name) {
    delete this.databases[name];

    const request = {};

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess();
      }
    }, 0);

    return request;
  },
};

// Replace the global indexedDB with our mock
global.indexedDB = mockIndexedDB;
