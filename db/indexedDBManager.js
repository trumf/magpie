/**
 * indexedDBManager.js
 *
 * A module for managing IndexedDB operations for the ZIP file storage.
 */

// Default configuration
const DEFAULT_CONFIG = {
  dbName: "ZipFileDB",
  dbVersion: 1,
  storeName: "zipFiles",
};

/**
 * Initialize the IndexedDB database
 * @param {Object} config - Configuration options (optional)
 * @param {function} statusCallback - Callback for status updates (optional)
 * @returns {Promise<IDBDatabase>} The database instance
 */
export async function initIndexedDB(config = {}, statusCallback = null) {
  // Merge default config with user-provided config
  const dbConfig = {...DEFAULT_CONFIG, ...config};

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbConfig.dbName, dbConfig.dbVersion);

    request.onerror = (event) => {
      console.error("IndexedDB error:", event.target.error);
      if (statusCallback) {
        statusCallback(
          "error",
          `Failed to open database: ${event.target.error.message}`
        );
      }
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      const db = event.target.result;
      console.log("Database opened successfully");
      if (statusCallback) {
        statusCallback("success", "Database opened successfully");
      }
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      console.log("Creating object store");

      // Create object store for zip files if it doesn't exist
      if (!db.objectStoreNames.contains(dbConfig.storeName)) {
        const store = db.createObjectStore(dbConfig.storeName, {
          keyPath: "id",
          autoIncrement: true,
        });
        store.createIndex("name", "name", {unique: false});
        store.createIndex("timestamp", "timestamp", {unique: false});
      }
    };
  });
}

/**
 * Save a ZIP data object to IndexedDB
 * @param {Object} zipData - The ZIP data to save
 * @param {Object} config - Configuration options (optional)
 * @param {IDBDatabase} db - The database instance (optional)
 * @returns {Promise<number>} The ID of the saved file
 */
export async function saveZipData(zipData, config = {}, db = null) {
  const dbConfig = {...DEFAULT_CONFIG, ...config};

  if (!db) {
    db = await initIndexedDB(config);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([dbConfig.storeName], "readwrite");
    const store = transaction.objectStore(dbConfig.storeName);
    const request = store.add(zipData);

    request.onsuccess = (event) => {
      console.log("Zip file data saved successfully");
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("Error saving zip file data:", event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Get all ZIP files from IndexedDB
 * @param {Object} config - Configuration options (optional)
 * @param {IDBDatabase} db - The database instance (optional)
 * @returns {Promise<Array>} Array of ZIP file objects
 */
export async function getAllZipFiles(config = {}, db = null) {
  const dbConfig = {...DEFAULT_CONFIG, ...config};

  if (!db) {
    db = await initIndexedDB(config);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([dbConfig.storeName], "readonly");
    const store = transaction.objectStore(dbConfig.storeName);
    const request = store.getAll();

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      console.error("Error getting zip files:", event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Get a single ZIP file by ID
 * @param {number} id - The ID of the ZIP file
 * @param {Object} config - Configuration options (optional)
 * @param {IDBDatabase} db - The database instance (optional)
 * @returns {Promise<Object>} The ZIP file object
 */
export async function getZipFileById(id, config = {}, db = null) {
  const dbConfig = {...DEFAULT_CONFIG, ...config};

  if (!db) {
    db = await initIndexedDB(config);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([dbConfig.storeName], "readonly");
    const store = transaction.objectStore(dbConfig.storeName);
    const request = store.get(id);

    request.onsuccess = (event) => {
      if (event.target.result) {
        resolve(event.target.result);
      } else {
        reject(new Error(`ZIP file with ID ${id} not found`));
      }
    };

    request.onerror = (event) => {
      console.error("Error getting zip file:", event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Update a ZIP file in the database
 * @param {Object} zipData - The ZIP data to update
 * @param {Object} config - Configuration options (optional)
 * @param {IDBDatabase} db - The database instance (optional)
 * @returns {Promise<number|string>} The ID of the updated ZIP file
 */
export async function updateZipFile(zipData, config = {}, db = null) {
  const dbConfig = {...DEFAULT_CONFIG, ...config};

  if (!db) {
    db = await initIndexedDB(config);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([dbConfig.storeName], "readwrite");
    const store = transaction.objectStore(dbConfig.storeName);
    const request = store.put(zipData);

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

/**
 * Clear all ZIP files from IndexedDB
 * @param {Object} config - Configuration options (optional)
 * @param {IDBDatabase} db - The database instance (optional)
 * @returns {Promise<void>}
 */
export async function clearZipFiles(config = {}, db = null) {
  const dbConfig = {...DEFAULT_CONFIG, ...config};

  if (!db) {
    db = await initIndexedDB(config);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([dbConfig.storeName], "readwrite");
    const store = transaction.objectStore(dbConfig.storeName);
    const request = store.clear();

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error("Error clearing zip files:", event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Delete a specific ZIP file by ID
 * @param {number} id - The ID of the ZIP file to delete
 * @param {Object} config - Configuration options (optional)
 * @param {IDBDatabase} db - The database instance (optional)
 * @returns {Promise<void>}
 */
export async function deleteZipFile(id, config = {}, db = null) {
  const dbConfig = {...DEFAULT_CONFIG, ...config};

  if (!db) {
    db = await initIndexedDB(config);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([dbConfig.storeName], "readwrite");
    const store = transaction.objectStore(dbConfig.storeName);
    const request = store.delete(id);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = (event) => {
      console.error("Error deleting zip file:", event.target.error);
      reject(event.target.error);
    };
  });
}
