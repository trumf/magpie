// services/AssetService.js

class AssetService {
  constructor() {
    this.dbName = "markdownDB";
    this.version = 3; // Increased version for new assets store
    this.db = null;
    this.assets = new Map(); // In-memory cache for current session
  }

  async initialize() {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => reject(new Error("Failed to open database"));

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

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
      };
    });
  }

  /**
   * Stores an asset (image, etc.) in the database and returns its unique ID
   */
  async storeAsset(asset) {
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

    // Store in IndexedDB for persistence
    const transaction = this.db.transaction(["assets"], "readwrite");
    const store = transaction.objectStore("assets");

    // Convert blob to ArrayBuffer for storage
    const arrayBuffer = await blob.arrayBuffer();

    await store.put({
      id,
      name,
      originalPath,
      arrayBuffer,
      mimeType: blob.type || this.getMimeTypeFromFilename(name),
      timestamp: new Date().toISOString(),
    });

    return id;
  }

  /**
   * Retrieves an asset by its ID, either from memory or database
   */
  async getAsset(id) {
    // Check memory cache first
    if (this.assets.has(id)) {
      return this.assets.get(id).url;
    }

    // Otherwise load from database
    const transaction = this.db.transaction(["assets"], "readonly");
    const store = transaction.objectStore("assets");

    return new Promise((resolve, reject) => {
      const request = store.get(id);

      request.onsuccess = () => {
        const asset = request.result;
        if (!asset) {
          return resolve(null);
        }

        // Convert ArrayBuffer back to Blob
        const blob = new Blob([asset.arrayBuffer], {type: asset.mimeType});
        const url = URL.createObjectURL(blob);

        // Store in memory cache
        this.assets.set(id, {url, blob, mimeType: asset.mimeType});

        resolve(url);
      };

      request.onerror = () => reject(new Error("Failed to get asset"));
    });
  }

  /**
   * Processes markdown content to replace image paths with asset IDs
   */
  processMarkdownContent(content, assetMap) {
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

export const getAssetService = async () => {
  if (!instance) {
    instance = new AssetService();
    await instance.initialize();
  }
  return instance;
};

export default getAssetService;
