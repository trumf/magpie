// services/FileStorageService.js

class FileStorageService {
  constructor() {
    this.dbName = "markdownDB";
    this.version = 2; // Start with version 1
    this.db = null;
  }

  async initialize() {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = (event) => {
        console.error("Database error:", event.target.error);
        reject(new Error("Failed to open database"));
      };

      request.onblocked = (event) => {
        console.warn("Database blocked:", event);
        // Close all other tabs/connections to the database
        if (this.db) {
          this.db.close();
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;

        // Handle database connection errors
        this.db.onerror = (event) => {
          console.error("Database error:", event.target.error);
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        console.log("Upgrading database...");
        const db = event.target.result;

        // Create files store if it doesn't exist
        if (!db.objectStoreNames.contains("files")) {
          const filesStore = db.createObjectStore("files", {
            keyPath: "path",
          });

          // Create indexes
          filesStore.createIndex("type", "type", {unique: false});
          filesStore.createIndex("name", "name", {unique: false});
          filesStore.createIndex("lastAccessed", "lastAccessed", {
            unique: false,
          });
        }
      };
    });
  }

  async saveFiles(files) {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["files"], "readwrite");

      transaction.onerror = (event) => {
        console.error("Transaction error:", event.target.error);
        reject(new Error("Failed to save files"));
      };

      const store = transaction.objectStore("files");

      // Clear existing files
      store.clear();

      // Add all new files with timestamp
      const timestamp = new Date().toISOString();
      let completed = 0;
      let hasError = false;

      files.forEach((file) => {
        const fileWithTimestamp = {
          ...file,
          lastAccessed: timestamp,
        };

        const request = store.add(fileWithTimestamp);

        request.onsuccess = () => {
          completed++;
          if (completed === files.length && !hasError) {
            resolve();
          }
        };

        request.onerror = (event) => {
          console.error("Error adding file:", event.target.error);
          hasError = true;
          reject(new Error("Failed to save file"));
        };
      });
    });
  }

  async getFiles() {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["files"], "readonly");
      const store = transaction.objectStore("files");
      const request = store.getAll();

      request.onsuccess = () => {
        const files = request.result;
        // Sort files: directories first, then by name
        files.sort((a, b) => {
          if (a.type !== b.type) {
            return a.type === "directory" ? -1 : 1;
          }
          return a.name.localeCompare(b.name);
        });
        resolve(files);
      };

      request.onerror = (event) => {
        console.error("Error getting files:", event.target.error);
        reject(new Error("Failed to get files"));
      };
    });
  }

  async updateFileAccess(path) {
    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["files"], "readwrite");
      const store = transaction.objectStore("files");
      const request = store.get(path);

      request.onsuccess = () => {
        const file = request.result;
        if (file) {
          file.lastAccessed = new Date().toISOString();
          store.put(file);
          resolve();
        } else {
          resolve(); // File not found, but not an error
        }
      };

      request.onerror = (event) => {
        console.error("Error updating file access:", event.target.error);
        reject(new Error("Failed to update file access"));
      };
    });
  }
}

let instance = null;

export const getFileStorageService = async () => {
  if (!instance) {
    instance = new FileStorageService();
    await instance.initialize();
  }
  return instance;
};

export default getFileStorageService;
