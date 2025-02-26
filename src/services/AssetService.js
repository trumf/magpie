// services/AssetService.js

class AssetService {
  constructor() {
    this.dbName = "markdownDB";
    this.version = 3; // Increased version for new assets store
    this.db = null;
    this.assets = new Map(); // In-memory cache for current session
    this.initialized = false;
    this.initPromise = null;
  }

  async initialize() {
    // If already initialized, return immediately
    if (this.initialized) return Promise.resolve();

    // If initialization is in progress, wait for it
    if (this.initPromise) return this.initPromise;

    console.log("AssetService: Starting database initialization");

    // Start initialization
    this.initPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = (event) => {
          console.error("AssetService: Database error:", event.target.error);
          this.initPromise = null; // Reset so we can try again
          reject(new Error("Failed to open database"));
        };

        request.onblocked = (event) => {
          console.warn("AssetService: Database blocked:", event);
          // Try to close any existing connection
          if (this.db) {
            this.db.close();
          }
        };

        request.onsuccess = (event) => {
          console.log("AssetService: Database opened successfully");
          this.db = event.target.result;
          this.initialized = true;
          resolve();
        };

        request.onupgradeneeded = (event) => {
          console.log("AssetService: Database upgrade needed");
          const db = event.target.result;
        };

        // Create assets store if it doesn't exist
        if (!db.objectStoreNames.contains("assets")) {
          const assetsStore = db.createObjectStore("assets", {
            keyPath: "id",
          });
          // Create assets store if it doesn't exist
          if (!db.objectStoreNames.contains("assets")) {
            const assetsStore = db.createObjectStore("assets", {
              keyPath: "id",
            });

            // Create indexes for querying
            assetsStore.createIndex("originalPath", "originalPath", {
              unique: false,
            });
            assetsStore.createIndex("name", "name", {
              unique: false,
            });
          }
        }
      } catch (error) {
        console.error("AssetService: Error during initialization:", error);
        this.initPromise = null;
        reject(error);
      }
    });

    // Add timeout and fallback
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => {
        console.warn("AssetService: Database initialization timed out");
        this.initialized = true; // Force initialized state
        resolve();
      }, 5000); // 5 second timeout
    });

    // Race the regular initialization with the timeout
    return Promise.race([this.initPromise, timeoutPromise]).catch((error) => {
      console.error(
        "AssetService: Initialization failed, using fallback:",
        error
      );
      this.initialized = true; // Force initialized state even on error
      return Promise.resolve(); // Continue anyway
    });

    return this.initPromise;
  }

  /**
   * Stores an asset (image, etc.) in the database and returns its unique ID
   */
  async storeAsset(asset) {
    try {
      // Ensure database is initialized
      await this.initialize();

      const {blob, name, originalPath} = asset;

      // Create a unique ID for the asset
      // (filename + hash of path to avoid collisions)
      const pathHash = this.hashString(originalPath || name);
      const id = `asset_${pathHash}_${name}`;

      // Store in memory cache
      const url = URL.createObjectURL(blob);
      this.assets.set(id, {
        url,
        blob,
        mimeType: blob.type || this.getMimeTypeFromFilename(name),
      });

      // Only try to store in IndexedDB if we have a database connection
      if (this.db) {
        try {
          // Store in IndexedDB for persistence
          const transaction = this.db.transaction(["assets"], "readwrite");
          const store = transaction.objectStore("assets");

          // Convert blob to ArrayBuffer for storage
          const arrayBuffer = await blob.arrayBuffer();

          await new Promise((resolve, reject) => {
            const request = store.put({
              id,
              name,
              originalPath,
              arrayBuffer,
              mimeType: blob.type || this.getMimeTypeFromFilename(name),
              timestamp: new Date().toISOString(),
            });

            request.onsuccess = () => resolve();
            request.onerror = (event) => {
              console.error("Error in store.put:", event);
              reject(new Error("Failed to store asset in database"));
            };
          });
        } catch (dbError) {
          console.error("Error storing asset in database:", dbError);
          // Continue anyway - we have it in memory
        }
      } else {
        console.warn("Database not available, storing asset in memory only");
      }

      return id;
    } catch (error) {
      console.error("Fatal error in storeAsset:", error);
      // Generate an ID anyway so we can continue
      const fallbackId = `fallback_${Date.now()}_${asset.name}`;
      return fallbackId;
    }
  }

  /**
   * Retrieves an asset by its ID, either from memory or database
   */
  async getAsset(id) {
    try {
      // Ensure database is initialized
      await this.initialize();

      // Check memory cache first
      if (this.assets.has(id)) {
        return this.assets.get(id).url;
      }

      // Only try database if we have a connection
      if (this.db) {
        try {
          const transaction = this.db.transaction(["assets"], "readonly");
          const store = transaction.objectStore("assets");

          const asset = await new Promise((resolve, reject) => {
            const request = store.get(id);
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(new Error("Failed to get asset"));
          });

          if (!asset) {
            return null;
          }

          // Convert ArrayBuffer back to Blob
          const blob = new Blob([asset.arrayBuffer], {type: asset.mimeType});
          const url = URL.createObjectURL(blob);

          // Store in memory cache
          this.assets.set(id, {url, blob, mimeType: asset.mimeType});
          // Store in memory cache
          this.assets.set(id, {url, blob, mimeType: asset.mimeType});

          return url;
        } catch (dbError) {
          console.error("Error retrieving from database:", dbError);
          return null;
        }
      } else {
        console.warn("Database not available for getAsset");
        return null;
      }
    } catch (error) {
      console.error("Fatal error in getAsset:", error);
      return null;
    }
  }

  /**
   * Processes markdown content to replace image paths with asset IDs
   */
  processMarkdownContent(content, assetMap) {
    try {
      // Replace image references in markdown
      return content.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, src) => {
        // Decode URL-encoded characters
        const decodedSrc = this.decodeUrl(src);

        // Look for the image in our asset map
        const assetKey = this.findAssetKey(decodedSrc, assetMap);

        if (assetKey) {
          return `![${alt}](asset://${assetKey})`;
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
   * Finds the corresponding asset key for a given source path
   */
  findAssetKey(src, assetMap) {
    // First try direct match (for full paths)
    if (assetMap[src]) {
      return assetMap[src];
    }

    // Then try just the filename
    const fileName = src.split("/").pop();
    if (assetMap[fileName]) {
      return assetMap[fileName];
    }

    // Look for partial matches in the path
    for (const [path, id] of Object.entries(assetMap)) {
      if (src.includes(path) || path.includes(src)) {
        return id;
      }
    }

    return null;
  }

  /**
   * Helper to decode URL components
   */
  decodeUrl(url) {
    try {
      return decodeURIComponent(url);
    } catch {
      return url;
    }
  }

  /**
   * Generates a simple hash from a string
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Tries to determine MIME type from filename
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
    };

    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * Clears all assets from memory
   */
  clearMemoryCache() {
    // Revoke all blob URLs to prevent memory leaks
    this.assets.forEach((asset) => {
      if (asset.url.startsWith("blob:")) {
        URL.revokeObjectURL(asset.url);
      }
    });

    this.assets.clear();
  }
}

let instance = null;
let initializationPromise = null;

export const getAssetService = async () => {
  if (!instance) {
    // Create the instance if it doesn't exist
    instance = new AssetService();
    try {
      await instance.initialize();
      console.log("AssetService initialized successfully");
    } catch (error) {
      console.error("Error initializing AssetService:", error);
      // Continue anyway with a partially initialized service
    }
  }

  // Wait for initialization to complete before returning
  if (initializationPromise) {
    await initializationPromise;
  }

  return instance;
};

export default getAssetService;
