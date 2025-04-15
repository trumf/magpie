// services/FileStorageService.js
import {getDatabaseService} from "./DatabaseService";

class FileStorageService {
  constructor() {
    this.initialized = false;
    this.initPromise = null;
    this.db = null;
  }

  async initialize() {
    if (this.initialized && this.db) return Promise.resolve();

    if (this.initPromise) {
      return this.initPromise;
    }

    console.log("FileStorageService: Starting initialization");
    this.initPromise = getDatabaseService()
      .then((dbService) => {
        if (!dbService || !dbService.db) {
          console.error("FileStorageService: Failed to get database service");
          throw new Error("Database service not available");
        }

        this.db = dbService.db;
        this.initialized = true;
        console.log("FileStorageService: Database initialized successfully");
        return;
      })
      .catch((error) => {
        this.initPromise = null; // Reset so we can try again
        console.error("FileStorageService: Initialization failed:", error);
        throw error;
      });

    return this.initPromise;
  }

  async saveFiles(files) {
    try {
      await this.initialize();

      if (!this.db) {
        throw new Error("Database not initialized");
      }

      // For better transaction management, process files in manageable chunks
      const chunkSize = 10;
      const chunks = [];
      for (let i = 0; i < files.length; i += chunkSize) {
        chunks.push(files.slice(i, i + chunkSize));
      }

      // Process each chunk with its own transaction
      for (const chunk of chunks) {
        await this._saveFileChunk(chunk);
      }

      console.log(`All ${files.length} files saved successfully`);
    } catch (error) {
      console.error("Error in saveFiles:", error);
      throw error;
    }
  }

  async _saveFileChunk(files) {
    return new Promise((resolve, reject) => {
      if (!this.db || !this.initialized) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction(["files"], "readwrite");
      const store = transaction.objectStore("files");
      const timestamp = new Date().toISOString();

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = (event) => {
        console.error("Transaction error:", event.target.error);
        reject(
          new Error(`Failed to save files chunk: ${event.target.error.message}`)
        );
      };

      // Add files to the store
      files.forEach((file) => {
        const fileWithTimestamp = {
          ...file,
          lastAccessed: timestamp,
        };

        // Use put instead of add to replace existing files with the same path
        const request = store.put(fileWithTimestamp);

        request.onerror = (event) => {
          console.error("Error adding file:", event.target.error);
          // Error will be handled by transaction.onerror
        };
      });
    });
  }

  async getFiles() {
    try {
      await this.initialize();

      if (!this.db) {
        throw new Error("Database not initialized");
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["files"], "readonly");
        const store = transaction.objectStore("files");
        const request = store.getAll();

        transaction.onerror = (event) => {
          console.error("Transaction error getting files:", event.target.error);
          reject(new Error("Failed to get files"));
        };

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
    } catch (error) {
      console.error("Error in getFiles:", error);
      throw error;
    }
  }

  async updateFileAccess(path) {
    try {
      await this.initialize();

      if (!this.db) {
        throw new Error("Database not initialized");
      }

      return new Promise((resolve, reject) => {
        const transaction = this.db.transaction(["files"], "readwrite");
        const store = transaction.objectStore("files");

        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = (event) => {
          console.error("Error updating file access:", event.target.error);
          reject(new Error("Failed to update file access"));
        };

        const request = store.get(path);

        request.onsuccess = () => {
          const file = request.result;
          if (file) {
            file.lastAccessed = new Date().toISOString();
            store.put(file);
          } else {
            // File not found, but not an error
            console.log(`File not found for path: ${path}, but continuing`);
            resolve(); // Important: resolve here if file not found
          }
        };

        request.onerror = (event) => {
          console.error("Error updating file access:", event.target.error);
          // Will be handled by transaction.onerror
        };
      });
    } catch (error) {
      console.error("Error in updateFileAccess:", error);
      // Not throwing here to allow the app to continue even if this fails
      return null;
    }
  }
}

// Singleton instance
let instance = null;

export const getFileStorageService = async () => {
  if (!instance) {
    instance = new FileStorageService();
    await instance.initialize();
  }
  return instance;
};

export default getFileStorageService;
