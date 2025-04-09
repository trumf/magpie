import JSZip from "jszip";

class ImprovedFileStorageService {
  constructor() {
    this.DB_NAME = "markdownDB";
    this.DB_VERSION = 1;
    this.STORES = {
      FILES: "files",
      ASSETS: "assets",
    };
    this.db = null;
    this.initialized = false;
    this.initPromise = null;
  }

  /**
   * Initialize the database
   */
  async initialize() {
    // If already initialized, return immediately
    if (this.initialized) {
      return Promise.resolve();
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    console.log("ImprovedFileStorageService: Starting database initialization");

    // Start initialization
    this.initPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

        request.onerror = (event) => {
          console.error("Database error:", event.target.error);
          this.initPromise = null; // Reset so we can try again
          reject(new Error("Failed to open database"));
        };

        request.onblocked = (event) => {
          console.warn("Database blocked:", event);
          // Try to close any existing connection
          if (this.db) {
            this.db.close();
          }
        };

        request.onsuccess = (event) => {
          console.log("Database opened successfully");
          this.db = event.target.result;
          this.initialized = true;

          // Handle database connection errors
          this.db.onerror = (event) => {
            console.error("Database error:", event.target.error);
          };

          resolve();
        };

        request.onupgradeneeded = (event) => {
          console.log("Database upgrade needed");
          const db = event.target.result;

          // Create files store if it doesn't exist
          if (!db.objectStoreNames.contains(this.STORES.FILES)) {
            const filesStore = db.createObjectStore(this.STORES.FILES, {
              keyPath: "path",
            });

            // Create indexes
            filesStore.createIndex("type", "type", {unique: false});
            filesStore.createIndex("name", "name", {unique: false});
            filesStore.createIndex("timestamp", "timestamp", {unique: false});
            filesStore.createIndex("parentDir", "parentDir", {unique: false});
          }

          // Create assets store if it doesn't exist
          if (!db.objectStoreNames.contains(this.STORES.ASSETS)) {
            const assetsStore = db.createObjectStore(this.STORES.ASSETS, {
              keyPath: "id",
            });

            // Create indexes
            assetsStore.createIndex("name", "name", {unique: false});
            assetsStore.createIndex("originalPath", "originalPath", {
              unique: false,
            });
            assetsStore.createIndex("timestamp", "timestamp", {unique: false});
          }
        };
      } catch (error) {
        console.error("Error during initialization:", error);
        this.initPromise = null;
        reject(error);
      }
    });

    // Add timeout and fallback
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.warn("Database initialization timed out");
        this.initialized = true; // Force initialized state
        resolve();
      }, 5000); // 5 second timeout
    });

    // Race the regular initialization with the timeout
    return Promise.race([this.initPromise, timeoutPromise]).catch((error) => {
      console.error("Initialization failed, using fallback:", error);
      this.initialized = true; // Force initialized state even on error
      return Promise.resolve(); // Continue anyway
    });
  }

  /**
   * Process and store a ZIP file
   */
  async processAndStoreZipFile(file) {
    // Ensure database is initialized
    await this.initialize();

    try {
      console.log("Processing ZIP file:", file.name);
      const jszip = new JSZip();
      const zip = await jszip.loadAsync(file);

      const files = [];
      const assets = [];
      const assetMap = {};
      const timestamp = new Date().toISOString();

      // First pass: identify and prepare assets
      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) continue;

        const fileName = path.split("/").pop();

        // Skip hidden files
        if (fileName.startsWith(".")) continue;

        // Process non-markdown files as assets
        if (!fileName.endsWith(".md")) {
          try {
            const blob = await zipEntry.async("blob");
            const mimeType = this.getMimeTypeFromFilename(fileName);

            // Create a unique ID for the asset
            const pathHash = this.hashString(path);
            const id = `asset_${pathHash}_${fileName}`;

            assets.push({
              id,
              name: fileName,
              originalPath: path,
              blob,
              mimeType,
              timestamp,
            });

            assetMap[path] = id;
            assetMap[fileName] = id; // Also map by filename alone
          } catch (error) {
            console.error(`Error processing asset ${fileName}:`, error);
          }
        }
      }

      // Second pass: process markdown files with asset references
      for (const [path, zipEntry] of Object.entries(zip.files)) {
        if (zipEntry.dir) {
          // Create directory entry
          const dirName = path.split("/").pop() || path;
          const parts = path.split("/").filter((p) => p);
          const parentDir =
            parts.length > 1 ? parts.slice(0, -1).join("/") : null;

          files.push({
            type: "directory",
            name: dirName,
            path: path,
            parentDir,
            timestamp,
          });
        } else {
          const fileName = path.split("/").pop();

          if (fileName.endsWith(".md")) {
            try {
              const content = await zipEntry.async("string");

              // Process content to replace image references
              const processedContent = this.processMarkdownContent(
                content,
                assetMap
              );

              // Determine parent directory
              const parts = path.split("/").filter((p) => p);
              const parentDir =
                parts.length > 1 ? parts.slice(0, -1).join("/") : null;

              files.push({
                type: "file",
                name: fileName,
                path: path,
                content: processedContent,
                parentDir,
                timestamp,
              });
            } catch (error) {
              console.error(`Error processing markdown ${fileName}:`, error);
            }
          }
        }
      }

      // Store assets in IndexedDB
      await this.storeAssets(assets);

      // Store files in IndexedDB
      await this.storeFiles(files);

      return {
        fileCount: files.length,
        assetCount: assets.length,
      };
    } catch (error) {
      console.error("Error processing ZIP file:", error);
      throw new Error(`Failed to process ZIP file: ${error.message}`);
    }
  }

  /**
   * Store files in IndexedDB
   */
  async storeFiles(files) {
    if (!this.db || !this.initialized) {
      console.warn("Database not initialized, cannot store files");
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORES.FILES], "readwrite");
      const store = transaction.objectStore(this.STORES.FILES);

      transaction.oncomplete = () => {
        resolve();
      };

      transaction.onerror = (event) => {
        console.error(
          "Transaction error when storing files:",
          event.target.error
        );
        reject(event.target.error);
      };

      // Add each file to the store
      files.forEach((file) => {
        store.put(file);
      });
    });
  }

  /**
   * Store assets in IndexedDB
   */
  async storeAssets(assets) {
    if (!this.db || !this.initialized) {
      console.warn("Database not initialized, cannot store assets");
      return;
    }

    const promises = assets.map(async (asset) => {
      return new Promise(async (resolve, reject) => {
        try {
          const transaction = this.db.transaction(
            [this.STORES.ASSETS],
            "readwrite"
          );
          const store = transaction.objectStore(this.STORES.ASSETS);

          // Convert blob to ArrayBuffer for storage
          const arrayBuffer = await asset.blob.arrayBuffer();

          const assetData = {
            id: asset.id,
            name: asset.name,
            originalPath: asset.originalPath,
            arrayBuffer,
            mimeType: asset.mimeType,
            timestamp: asset.timestamp,
          };

          const request = store.put(assetData);

          request.onsuccess = () => {
            resolve();
          };

          request.onerror = (event) => {
            console.error("Error storing asset:", event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          console.error("Error processing asset for storage:", error);
          resolve(); // Continue with other assets even if one fails
        }
      });
    });

    return Promise.all(promises);
  }

  /**
   * Get all files from IndexedDB
   */
  async getFiles() {
    if (!this.db || !this.initialized) {
      console.warn("Database not initialized, cannot get files");
      return [];
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORES.FILES], "readonly");
      const store = transaction.objectStore(this.STORES.FILES);
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
        reject(event.target.error);
      };
    });
  }

  /**
   * Get a file by path
   */
  async getFile(path) {
    if (!this.db || !this.initialized) {
      console.warn("Database not initialized, cannot get file");
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORES.FILES], "readonly");
      const store = transaction.objectStore(this.STORES.FILES);
      const request = store.get(path);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.error("Error getting file:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Update file with new content
   */
  async updateFile(path, newContent) {
    if (!this.db || !this.initialized) {
      console.warn("Database not initialized, cannot update file");
      return false;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORES.FILES], "readwrite");
      const store = transaction.objectStore(this.STORES.FILES);
      const request = store.get(path);

      request.onsuccess = () => {
        const file = request.result;
        if (!file) {
          reject(new Error("File not found"));
          return;
        }

        file.content = newContent;
        file.timestamp = new Date().toISOString();

        const updateRequest = store.put(file);

        updateRequest.onsuccess = () => {
          resolve(true);
        };

        updateRequest.onerror = (event) => {
          console.error("Error updating file:", event.target.error);
          reject(event.target.error);
        };
      };

      request.onerror = (event) => {
        console.error("Error getting file for update:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Get an asset by its ID
   */
  async getAsset(id) {
    if (!this.db || !this.initialized) {
      console.warn("Database not initialized, cannot get asset");
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction([this.STORES.ASSETS], "readonly");
      const store = transaction.objectStore(this.STORES.ASSETS);
      const request = store.get(id);

      request.onsuccess = () => {
        const asset = request.result;
        if (!asset) {
          resolve(null);
          return;
        }

        // Convert ArrayBuffer back to Blob
        const blob = new Blob([asset.arrayBuffer], {type: asset.mimeType});
        const url = URL.createObjectURL(blob);

        resolve({
          id: asset.id,
          name: asset.name,
          url,
          mimeType: asset.mimeType,
        });
      };

      request.onerror = (event) => {
        console.error("Error getting asset:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Clear the database (remove all files and assets)
   */
  async clearDatabase() {
    if (!this.db || !this.initialized) {
      console.warn("Database not initialized, cannot clear");
      return;
    }

    return new Promise((resolve, reject) => {
      // Clear files
      const filesTxn = this.db.transaction([this.STORES.FILES], "readwrite");
      const filesStore = filesTxn.objectStore(this.STORES.FILES);
      const filesRequest = filesStore.clear();

      filesRequest.onsuccess = () => {
        // Clear assets
        const assetsTxn = this.db.transaction(
          [this.STORES.ASSETS],
          "readwrite"
        );
        const assetsStore = assetsTxn.objectStore(this.STORES.ASSETS);
        const assetsRequest = assetsStore.clear();

        assetsRequest.onsuccess = () => {
          resolve();
        };

        assetsRequest.onerror = (event) => {
          console.error("Error clearing assets:", event.target.error);
          reject(event.target.error);
        };
      };

      filesRequest.onerror = (event) => {
        console.error("Error clearing files:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Process markdown content to replace image paths with asset IDs
   */
  processMarkdownContent(content, assetMap) {
    try {
      // Replace image references in markdown
      return content.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
        // Decode URL-encoded characters
        const decodedSrc = this.decodeUrl(src);

        // Look for the image in the asset map
        if (assetMap[decodedSrc]) {
          return `![${alt}](asset://${assetMap[decodedSrc]})`;
        }

        // Try with just the filename
        const filename = decodedSrc.split("/").pop();
        if (assetMap[filename]) {
          return `![${alt}](asset://${assetMap[filename]})`;
        }

        // If not found, return the original match
        return match;
      });
    } catch (error) {
      console.error("Error processing markdown content:", error);
      return content; // Return original content on error
    }
  }

  /**
   * Decode URL-encoded characters
   */
  decodeUrl(url) {
    try {
      return decodeURIComponent(url);
    } catch (e) {
      return url;
    }
  }

  /**
   * Generate a simple hash from a string
   */
  hashString(str) {
    let hash = 0;
    if (str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash).toString(16);
  }

  /**
   * Get MIME type from filename
   */
  getMimeTypeFromFilename(filename) {
    const ext = filename.split(".").pop().toLowerCase();

    const mimeTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      svg: "image/svg+xml",
      webp: "image/webp",
      pdf: "application/pdf",
      txt: "text/plain",
      md: "text/markdown",
      html: "text/html",
      css: "text/css",
      js: "application/javascript",
      json: "application/json",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }
}

// Singleton instance
let instance = null;

export const getImprovedFileStorageService = async () => {
  if (!instance) {
    instance = new ImprovedFileStorageService();
    await instance.initialize();
  }
  return instance;
};

export default getImprovedFileStorageService;
