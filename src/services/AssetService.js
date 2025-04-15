// services/AssetService.js
import {getDatabaseService} from "./DatabaseService";

class AssetService {
  constructor() {
    this.assets = new Map(); // In-memory cache for current session
    this.initialized = false;
    this.initPromise = null;
    this.db = null;
  }

  async initialize() {
    // If already initialized, return immediately
    if (this.initialized && this.db) {
      return Promise.resolve();
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    console.log("AssetService: Starting database initialization");

    // Start initialization
    this.initPromise = getDatabaseService()
      .then((dbService) => {
        if (!dbService || !dbService.db) {
          console.error("AssetService: Failed to get database service");
          throw new Error("Database service not available");
        }

        this.db = dbService.db;
        this.initialized = true;
        console.log("AssetService: Database initialized successfully");
        return;
      })
      .catch((error) => {
        this.initPromise = null; // Reset so we can try again
        console.error("AssetService: Initialization failed:", error);
        throw error;
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
          // Convert blob to ArrayBuffer for storage
          const arrayBuffer = await blob.arrayBuffer();

          // Use a single transaction with proper error handling
          await this._storeAssetInDB(
            id,
            name,
            originalPath,
            arrayBuffer,
            blob.type
          );
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
   * Helper function to store asset in database with proper transaction handling
   */
  async _storeAssetInDB(id, name, originalPath, arrayBuffer, blobType) {
    return new Promise((resolve, reject) => {
      if (!this.db || !this.initialized) {
        reject(new Error("Database not initialized"));
        return;
      }

      // Create a new transaction specific to this operation
      const transaction = this.db.transaction(["assets"], "readwrite");
      const store = transaction.objectStore("assets");

      transaction.oncomplete = () => {
        console.log("Asset stored successfully:", name);
        resolve();
      };

      transaction.onerror = (event) => {
        console.error("Transaction error:", event.target.error);
        reject(
          new Error(
            `Failed to store asset in database: ${event.target.error.message}`
          )
        );
      };

      // Create the asset record
      const assetRecord = {
        id,
        name,
        originalPath,
        arrayBuffer,
        mimeType: blobType || this.getMimeTypeFromFilename(name),
        timestamp: new Date().toISOString(),
      };

      // Perform the put operation within the transaction
      const request = store.put(assetRecord);

      request.onerror = (event) => {
        console.error("Error in store.put:", event.target.error);
        // Error will be handled by transaction.onerror
      };
    });
  }

  /**
   * Batch store multiple assets with proper transaction handling
   * @param {Array} assets Array of asset objects to store
   * @returns {Promise<Array>} Array of asset IDs
   */
  async storeAssets(assets) {
    if (!assets || !assets.length) {
      return [];
    }

    try {
      await this.initialize();

      // Process in chunks to ensure transactions don't time out
      const chunkSize = 5;
      const assetIds = [];

      // Process assets in sequential chunks
      for (let i = 0; i < assets.length; i += chunkSize) {
        const chunk = assets.slice(i, i + chunkSize);
        // Process each asset individually but in sequence
        for (const asset of chunk) {
          const id = await this.storeAsset(asset);
          assetIds.push(id);
        }
      }

      return assetIds;
    } catch (error) {
      console.error("Error in batch storeAssets:", error);
      // Return asset IDs for assets we managed to store
      return assets.map((asset) => {
        const pathHash = this.hashString(asset.originalPath || asset.name);
        return `asset_${pathHash}_${asset.name}`;
      });
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
        return this.assets.get(id);
      }

      // Only try database if we have a connection
      if (this.db) {
        try {
          const asset = await this._getAssetFromDB(id);

          if (!asset) {
            return null;
          }

          // Convert ArrayBuffer back to Blob
          const blob = new Blob([asset.arrayBuffer], {type: asset.mimeType});
          const url = URL.createObjectURL(blob);

          // Store in memory cache
          const assetObj = {url, blob, mimeType: asset.mimeType};
          this.assets.set(id, assetObj);

          return assetObj;
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
   * Helper function to get asset from database with proper transaction handling
   */
  async _getAssetFromDB(id) {
    return new Promise((resolve, reject) => {
      if (!this.db || !this.initialized) {
        reject(new Error("Database not initialized"));
        return;
      }

      const transaction = this.db.transaction(["assets"], "readonly");
      const store = transaction.objectStore("assets");

      transaction.onerror = (event) => {
        console.error("Transaction error:", event.target.error);
        reject(new Error(`Failed to get asset: ${event.target.error.message}`));
      };

      const request = store.get(id);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = (event) => {
        console.error("Error in store.get:", event.target.error);
        reject(new Error(`Failed to get asset: ${event.target.error.message}`));
      };
    });
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

    return null;
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
    if (!str || str.length === 0) return hash;

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
    if (!filename) return "application/octet-stream";

    const ext = filename.split(".").pop().toLowerCase();

    const mimeTypes = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      svg: "image/svg+xml",
      webp: "image/webp",
      pdf: "application/pdf",
    };

    return mimeTypes[ext] || "application/octet-stream";
  }

  /**
   * Clear the memory cache
   */
  clearMemoryCache() {
    // Revoke all object URLs to prevent memory leaks
    for (const asset of this.assets.values()) {
      if (asset.url) {
        URL.revokeObjectURL(asset.url);
      }
    }

    this.assets.clear();
  }
}

let instance = null;

export const getAssetService = async () => {
  if (!instance) {
    instance = new AssetService();
    await instance.initialize();
  }
  return instance;
};

export default getAssetService;
