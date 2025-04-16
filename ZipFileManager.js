/**
 * ZipFileManager.js
 *
 * A module for importing, storing, and retrieving ZIP files using IndexedDB.
 * Requires JSZip library for ZIP file parsing.
 */

// Import headline extraction
import {extractDisplayName} from "./HeadlineExtraction.js";

// Default configuration
const DEFAULT_CONFIG = {
  dbName: "ZipFileDB",
  dbVersion: 1,
  storeName: "zipFiles",
  maxContentPreviewLength: 10000000,
  statusDisplayDuration: 5000,
};

export class ZipFileManager {
  constructor(config = {}) {
    // Merge default config with user-provided config
    this.config = {...DEFAULT_CONFIG, ...config};
    this.db = null;
    this.statusCallback = config.statusCallback || null;
  }

  /**
   * Initialize the IndexedDB database
   * @returns {Promise<IDBDatabase>} The database instance
   */
  async initIndexedDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      request.onerror = (event) => {
        console.error("IndexedDB error:", event.target.error);
        this.showStatus(
          "error",
          `Failed to open database: ${event.target.error.message}`
        );
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        console.log("Database opened successfully");
        this.showStatus("success", "Database opened successfully");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        console.log("Creating object store");

        // Create object store for zip files if it doesn't exist
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, {
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
   * Display status message
   * @param {string} type - The type of status (success, error, info)
   * @param {string} message - The message to display
   * @param {HTMLElement} element - Optional DOM element to display status in
   */
  showStatus(type, message, element = null) {
    // If a status callback is provided, use it
    if (this.statusCallback) {
      this.statusCallback(type, message);
      return;
    }

    // If an element is provided, update its innerHTML
    if (element) {
      element.innerHTML = `<div class="status ${type}">${message}</div>`;

      // Clear status after specified duration
      setTimeout(() => {
        element.innerHTML = "";
      }, this.config.statusDisplayDuration);
    }
  }

  /**
   * Save a ZIP file to IndexedDB
   * @param {File} file - The ZIP file to save
   * @returns {Promise<number>} The ID of the saved file
   */
  async saveZipFile(file) {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (event) => {
        try {
          // Make sure JSZip is available
          if (typeof JSZip !== "function") {
            throw new Error(
              "JSZip library not found. Please include JSZip in your project."
            );
          }

          const arrayBuffer = event.target.result;
          const jszip = new JSZip();
          const zip = await jszip.loadAsync(arrayBuffer);

          // Process ZIP contents
          const files = [];
          let totalSize = 0;

          for (const [path, zipEntry] of Object.entries(zip.files)) {
            if (!zipEntry.dir) {
              const content = await zipEntry.async("string");

              // Extract display name for markdown files
              let displayName = path;
              if (
                path.toLowerCase().endsWith(".md") ||
                path.toLowerCase().endsWith(".markdown")
              ) {
                displayName = extractDisplayName(content, path);
              }

              files.push({
                path,
                displayName,
                size: content.length,
                content: content,
              });
              totalSize += content.length;
            }
          }

          // Save to IndexedDB
          const transaction = this.db.transaction(
            [this.config.storeName],
            "readwrite"
          );
          const store = transaction.objectStore(this.config.storeName);

          const zipData = {
            name: file.name,
            size: file.size,
            timestamp: new Date().toISOString(),
            fileCount: files.length,
            totalSize,
            files,
          };

          const request = store.add(zipData);

          request.onsuccess = (event) => {
            console.log("Zip file saved successfully");
            resolve(event.target.result);
          };

          request.onerror = (event) => {
            console.error("Error saving zip file:", event.target.error);
            reject(event.target.error);
          };
        } catch (error) {
          console.error("Error processing zip file:", error);
          reject(error);
        }
      };

      reader.onerror = (event) => {
        console.error("Error reading file:", event.target.error);
        reject(event.target.error);
      };

      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Get all ZIP files from IndexedDB
   * @returns {Promise<Array>} Array of ZIP file objects
   */
  async getAllZipFiles() {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.config.storeName],
        "readonly"
      );
      const store = transaction.objectStore(this.config.storeName);
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
   * @returns {Promise<Object>} The ZIP file object
   */
  async getZipFileById(id) {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.config.storeName],
        "readonly"
      );
      const store = transaction.objectStore(this.config.storeName);
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
   * Clear all ZIP files from IndexedDB
   * @returns {Promise<void>}
   */
  async clearZipFiles() {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.config.storeName],
        "readwrite"
      );
      const store = transaction.objectStore(this.config.storeName);
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
   * @returns {Promise<void>}
   */
  async deleteZipFile(id) {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.config.storeName],
        "readwrite"
      );
      const store = transaction.objectStore(this.config.storeName);
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

  /**
   * Format file size in human-readable format
   * @param {number} bytes - Size in bytes
   * @returns {string} Formatted size (e.g., "1.23 KB")
   */
  formatSize(bytes) {
    if (bytes < 1024) {
      return bytes + " bytes";
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + " KB";
    } else {
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    }
  }

  /**
   * Generate HTML content to display ZIP files
   * @param {Array} zipFiles - Array of ZIP file objects
   * @returns {string} HTML content
   */
  generateZipFilesHtml(zipFiles) {
    if (zipFiles.length === 0) {
      return "<p>No ZIP files stored in the database.</p>";
    }

    let html = "<table>";
    html +=
      "<tr><th>ID</th><th>Name</th><th>Size</th><th>Files</th><th>Timestamp</th></tr>";

    for (const zipFile of zipFiles) {
      html += `
        <tr>
          <td>${zipFile.id}</td>
          <td>${zipFile.name}</td>
          <td>${this.formatSize(zipFile.size)}</td>
          <td>${zipFile.fileCount}</td>
          <td>${new Date(zipFile.timestamp).toLocaleString()}</td>
        </tr>
      `;
    }

    html += "</table>";

    // Add file details for the most recent upload
    const mostRecent = zipFiles[zipFiles.length - 1];
    if (mostRecent) {
      html += `<h3>Content of ${mostRecent.name} (showing ${mostRecent.files.length} files)</h3>`;
      html += "<pre>";

      mostRecent.files.forEach((file, index) => {
        if (index < 10) {
          // Limit to first 10 files to avoid overloading the UI
          html += `<strong>${file.path}</strong> (${this.formatSize(
            file.size
          )}):\n`;
          html += `${file.content}\n\n`;
        }
      });

      if (mostRecent.files.length > 10) {
        html += `... and ${mostRecent.files.length - 10} more files`;
      }

      html += "</pre>";
    }

    return html;
  }

  /**
   * Mark a file as read
   * @param {number|string} zipId - The ID of the ZIP file
   * @param {string} filePath - The path of the file to mark as read
   * @returns {Promise<boolean>} True if file was successfully marked as read
   */
  async markFileAsRead(zipId, filePath) {
    if (!this.db) {
      await this.initIndexedDB();
    }

    try {
      // Get the current ZIP file data
      const zipData = await this.getZipFileById(zipId);
      if (!zipData) {
        return false;
      }

      // Find the file in the ZIP
      const fileIndex = zipData.files.findIndex(
        (file) => file.path === filePath
      );
      if (fileIndex === -1) {
        return false;
      }

      // Update the file's read status
      zipData.files[fileIndex].isRead = true;
      zipData.files[fileIndex].readDate = new Date().toISOString();

      // Save the updated ZIP data
      await this._updateZipFile(zipData);
      return true;
    } catch (error) {
      console.error("Error marking file as read:", error);
      return false;
    }
  }

  /**
   * Mark a file as unread
   * @param {number|string} zipId - The ID of the ZIP file
   * @param {string} filePath - The path of the file to mark as unread
   * @returns {Promise<boolean>} True if file was successfully marked as unread
   */
  async markFileAsUnread(zipId, filePath) {
    if (!this.db) {
      await this.initIndexedDB();
    }

    try {
      // Get the current ZIP file data
      const zipData = await this.getZipFileById(zipId);
      if (!zipData) {
        return false;
      }

      // Find the file in the ZIP
      const fileIndex = zipData.files.findIndex(
        (file) => file.path === filePath
      );
      if (fileIndex === -1) {
        return false;
      }

      // Update the file's read status
      zipData.files[fileIndex].isRead = false;
      delete zipData.files[fileIndex].readDate;

      // Save the updated ZIP data
      await this._updateZipFile(zipData);
      return true;
    } catch (error) {
      console.error("Error marking file as unread:", error);
      return false;
    }
  }

  /**
   * Toggle the read state of a file
   * @param {number|string} zipId - The ID of the ZIP file
   * @param {string} filePath - The path of the file to toggle
   * @returns {Promise<boolean>} The new read state (true = read, false = unread)
   */
  async toggleReadState(zipId, filePath) {
    if (!this.db) {
      await this.initIndexedDB();
    }

    try {
      // Check current read state
      const isRead = await this.isFileRead(zipId, filePath);

      // Toggle the state
      if (isRead) {
        await this.markFileAsUnread(zipId, filePath);
        return false;
      } else {
        await this.markFileAsRead(zipId, filePath);
        return true;
      }
    } catch (error) {
      console.error("Error toggling read state:", error);
      return false;
    }
  }

  /**
   * Check if a file is marked as read
   * @param {number|string} zipId - The ID of the ZIP file
   * @param {string} filePath - The path of the file to check
   * @returns {Promise<boolean>} True if the file is marked as read
   */
  async isFileRead(zipId, filePath) {
    if (!this.db) {
      await this.initIndexedDB();
    }

    try {
      // Get the current ZIP file data
      const zipData = await this.getZipFileById(zipId);
      if (!zipData) {
        return false;
      }

      // Find the file in the ZIP
      const file = zipData.files.find((file) => file.path === filePath);
      if (!file) {
        return false;
      }

      // Return the read status
      return file.isRead === true;
    } catch (error) {
      console.error("Error checking if file is read:", error);
      return false;
    }
  }

  /**
   * Update a file's read status directly (helper for testing)
   * @param {Object} zipData - ZIP file data
   * @param {string} filePath - Path of the file to update
   * @param {boolean} isRead - Read status to set
   * @returns {Object} Updated ZIP data
   */
  updateFileReadStatus(zipData, filePath, isRead) {
    if (!zipData || !zipData.files) {
      return zipData;
    }

    const fileIndex = zipData.files.findIndex((file) => file.path === filePath);
    if (fileIndex !== -1) {
      if (isRead) {
        zipData.files[fileIndex].isRead = true;
        zipData.files[fileIndex].readDate = new Date().toISOString();
      } else {
        zipData.files[fileIndex].isRead = false;
        delete zipData.files[fileIndex].readDate;
      }
    }

    return zipData;
  }

  /**
   * Check if a file is marked as read (direct check without DB)
   * @param {Object} zipData - ZIP file data
   * @param {string} filePath - Path of the file to check
   * @returns {boolean} True if the file is marked as read
   */
  checkFileReadStatus(zipData, filePath) {
    if (!zipData || !zipData.files) {
      return false;
    }

    const file = zipData.files.find((file) => file.path === filePath);
    return file ? file.isRead === true : false;
  }

  /**
   * Get all files marked as read for a ZIP file
   * @param {number|string} zipId - The ID of the ZIP file
   * @returns {Promise<Array>} Array of files marked as read
   */
  async getAllReadFiles(zipId) {
    if (!this.db) {
      await this.initIndexedDB();
    }

    try {
      // Get the current ZIP file data
      const zipData = await this.getZipFileById(zipId);
      if (!zipData) {
        return [];
      }

      // Filter for read files
      return zipData.files.filter((file) => file.isRead === true);
    } catch (error) {
      console.error("Error getting read files:", error);
      return [];
    }
  }

  /**
   * Update a ZIP file in the database
   * @private
   * @param {Object} zipData - The ZIP data to update
   * @returns {Promise<number|string>} The ID of the updated ZIP file
   */
  async _updateZipFile(zipData) {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.config.storeName],
        "readwrite"
      );
      const store = transaction.objectStore(this.config.storeName);

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
   * Sort files by their read/unread status with various sorting options
   * @param {Array} files - The array of file objects to sort
   * @param {string} sortOrder - The sort order ('unread_first', 'read_first', 'read_date', or 'alphabet')
   * @returns {Array} The sorted array of files
   */
  sortFilesByReadStatus(files, sortOrder) {
    if (!files || !Array.isArray(files) || files.length === 0) {
      return [];
    }

    // Create a copy of the array to avoid modifying the original
    const filesCopy = [...files];

    switch (sortOrder) {
      case "unread_first":
        // Sort unread files first, then alphabetically within each group
        return filesCopy.sort((a, b) => {
          // If a is read and b is unread, b comes first
          if (a.isRead && !b.isRead) return 1;
          // If a is unread and b is read, a comes first
          if (!a.isRead && b.isRead) return -1;
          // Otherwise sort alphabetically by path
          return a.path.localeCompare(b.path);
        });

      case "read_first":
        // Sort read files first, then alphabetically within each group
        return filesCopy.sort((a, b) => {
          // If a is unread and b is read, b comes first
          if (!a.isRead && b.isRead) return 1;
          // If a is read and b is unread, a comes first
          if (a.isRead && !b.isRead) return -1;
          // Otherwise sort alphabetically by path
          return a.path.localeCompare(b.path);
        });

      case "read_date":
        // Sort by most recently read first, with unread files at the end
        return filesCopy.sort((a, b) => {
          // If both are read, sort by read date (most recent first)
          if (a.isRead && b.isRead) {
            return new Date(b.readDate) - new Date(a.readDate);
          }
          // If only a is read, it comes first
          if (a.isRead && !b.isRead) return -1;
          // If only b is read, it comes first
          if (!a.isRead && b.isRead) return 1;
          // If both are unread, sort alphabetically
          return a.path.localeCompare(b.path);
        });

      case "alphabet":
      default:
        // Default to alphabetical sorting by path
        return filesCopy.sort((a, b) => a.path.localeCompare(b.path));
    }
  }
}
