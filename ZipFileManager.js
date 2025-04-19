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

// Import status and sort functions
import {
  updateFileReadStatus,
  checkFileReadStatus,
  sortFilesByReadStatus as sortFilesByStatus, // alias to avoid conflict
} from "./status/fileStatusManager.js";

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
      let zipData = await this.getZipFileById(zipId);
      if (!zipData) {
        console.error("Error marking file as read: Zip file not found.");
        return false;
      }

      // Update the file's status in the zipData object
      zipData = updateFileReadStatus(zipData, filePath, true);

      // Check if the file was actually found and updated by the helper
      if (!zipData.files.find((f) => f.path === filePath)?.isRead) {
        console.error(
          "Error marking file as read: File path not found within zipData."
        );
        return false; // File path wasn't found in the data
      }

      // Save the updated ZIP data back to the database
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
      let zipData = await this.getZipFileById(zipId);
      if (!zipData) {
        console.error("Error marking file as unread: Zip file not found.");
        return false;
      }

      // Update the file's status in the zipData object
      zipData = updateFileReadStatus(zipData, filePath, false);

      // Check if the file was actually found and updated by the helper
      const targetFile = zipData.files.find((f) => f.path === filePath);
      if (!targetFile || targetFile.isRead === true) {
        console.error(
          "Error marking file as unread: File path not found or status not updated."
        );
        return false; // File path wasn't found or status didn't change
      }

      // Save the updated ZIP data back to the database
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
      let zipData = await this.getZipFileById(zipId);
      if (!zipData) {
        console.error("Error checking if file is read: Zip file not found.");
        return false;
      }

      // Find the file in the ZIP and check its status using the helper
      // Note: checkFileReadStatus operates on the retrieved data, not the DB directly
      return checkFileReadStatus(zipData, filePath);
    } catch (error) {
      console.error("Error checking if file is read:", error);
      return false;
    }
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
    // Delegate directly to the imported function
    return sortFilesByStatus(files, sortOrder);
  }
}
