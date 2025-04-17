/**
 * ZipFileManager.js
 *
 * A module for importing, storing, and retrieving ZIP files using IndexedDB.
 * Requires JSZip library for ZIP file parsing.
 */

// Import headline extraction
// import {extractDisplayName} from "./HeadlineExtraction.js";

// Import IndexedDB manager functions
import {
  initIndexedDB,
  saveZipData,
  getAllZipFiles,
  getZipFileById,
  updateZipFile,
  clearZipFiles,
  deleteZipFile,
} from "./db/indexedDBManager.js";

// Import the parser
import {parseZipFile} from "./parser/zipParser.js";

// Import view functions
import {showStatus} from "./view/htmlGenerator.js";

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
    try {
      this.db = await initIndexedDB(
        {
          dbName: this.config.dbName,
          dbVersion: this.config.dbVersion,
          storeName: this.config.storeName,
        },
        this.statusCallback
      );
      return this.db;
    } catch (error) {
      showStatus(
        "error",
        `Failed to open database: ${error.message}`,
        this.statusCallback,
        null,
        this.config.statusDisplayDuration
      );
      throw error;
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

    try {
      // Parse the zip file using the dedicated parser
      const zipData = await parseZipFile(file);

      // Save the extracted data to IndexedDB
      const id = await saveZipData(
        zipData,
        {
          dbName: this.config.dbName,
          dbVersion: this.config.dbVersion,
          storeName: this.config.storeName,
        },
        this.db
      );
      console.log("Zip file saved successfully with ID:", id);
      return id;
    } catch (error) {
      console.error("Error saving zip file:", error);
      // Propagate the error so the caller knows something went wrong
      throw error;
    }
  }

  /**
   * Get all ZIP files from IndexedDB
   * @returns {Promise<Array>} Array of ZIP file objects
   */
  async getAllZipFiles() {
    if (!this.db) {
      await this.initIndexedDB();
    }

    try {
      return await getAllZipFiles(
        {
          dbName: this.config.dbName,
          dbVersion: this.config.dbVersion,
          storeName: this.config.storeName,
        },
        this.db
      );
    } catch (error) {
      console.error("Error getting zip files:", error);
      throw error;
    }
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

    try {
      return await getZipFileById(
        id,
        {
          dbName: this.config.dbName,
          dbVersion: this.config.dbVersion,
          storeName: this.config.storeName,
        },
        this.db
      );
    } catch (error) {
      console.error("Error getting zip file:", error);
      throw error;
    }
  }

  /**
   * Clear all ZIP files from IndexedDB
   * @returns {Promise<void>}
   */
  async clearZipFiles() {
    if (!this.db) {
      await this.initIndexedDB();
    }

    try {
      await clearZipFiles(
        {
          dbName: this.config.dbName,
          dbVersion: this.config.dbVersion,
          storeName: this.config.storeName,
        },
        this.db
      );
    } catch (error) {
      console.error("Error clearing zip files:", error);
      throw error;
    }
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

    try {
      await deleteZipFile(
        id,
        {
          dbName: this.config.dbName,
          dbVersion: this.config.dbVersion,
          storeName: this.config.storeName,
        },
        this.db
      );
    } catch (error) {
      console.error("Error deleting zip file:", error);
      throw error;
    }
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

    try {
      return await updateZipFile(
        zipData,
        {
          dbName: this.config.dbName,
          dbVersion: this.config.dbVersion,
          storeName: this.config.storeName,
        },
        this.db
      );
    } catch (error) {
      console.error("Error updating zip file:", error);
      throw error;
    }
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
