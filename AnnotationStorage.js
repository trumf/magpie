/**
 * AnnotationStorage.js
 *
 * A module for storing and retrieving annotations using IndexedDB.
 * Provides methods to save, update, delete, and query annotations.
 */

// Default configuration
const DEFAULT_CONFIG = {
  dbName: "AnnotationDB",
  dbVersion: 1,
  storeName: "annotations",
  statusDisplayDuration: 5000,
};

export class AnnotationStorage {
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
        this.showStatus("success", "Annotation database opened successfully");
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create object store for annotations if it doesn't exist
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          const store = db.createObjectStore(this.config.storeName, {
            keyPath: "id",
          });

          // Create indexes for efficient querying
          store.createIndex("fileId", "fileId", {unique: false});
          store.createIndex("filePath", "filePath", {unique: false});
          store.createIndex("dateCreated", "dateCreated", {unique: false});
        }
      };
    });
  }

  /**
   * Display status message
   * @param {string} type - The type of status (success, error, info)
   * @param {string} message - The message to display
   */
  showStatus(type, message) {
    // If a status callback is provided, use it
    if (this.statusCallback) {
      this.statusCallback(type, message);
    }
  }

  /**
   * Save an annotation to IndexedDB
   * @param {Object} annotation - The annotation to save
   * @returns {Promise<string>} The ID of the saved annotation
   */
  async saveAnnotation(annotation) {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.config.storeName],
        "readwrite"
      );
      const store = transaction.objectStore(this.config.storeName);

      // Ensure the dateCreated is stored as a string for proper indexing
      const annotationToStore = {
        ...annotation,
        dateCreated:
          annotation.dateCreated instanceof Date
            ? annotation.dateCreated.toISOString()
            : annotation.dateCreated,
      };

      const request = store.put(annotationToStore);

      request.onsuccess = () => {
        this.showStatus("success", "Annotation saved successfully");
        resolve(annotation.id);
      };

      request.onerror = (event) => {
        console.error("Error saving annotation:", event.target.error);
        this.showStatus(
          "error",
          `Failed to save annotation: ${event.target.error.message}`
        );
        reject(event.target.error);
      };
    });
  }

  /**
   * Update an existing annotation
   * @param {Object} annotation - The annotation with updated properties
   * @returns {Promise<string>} The ID of the updated annotation
   */
  async updateAnnotation(annotation) {
    // The put method replaces the entire object, so we can reuse saveAnnotation
    return this.saveAnnotation(annotation);
  }

  /**
   * Get an annotation by its ID
   * @param {string} id - The ID of the annotation
   * @returns {Promise<Object>} The annotation object
   */
  async getAnnotationById(id) {
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
          // Convert dateCreated back to a Date object if it's a string
          const annotation = event.target.result;
          if (typeof annotation.dateCreated === "string") {
            annotation.dateCreated = new Date(annotation.dateCreated);
          }
          resolve(annotation);
        } else {
          reject(new Error(`Annotation with ID ${id} not found`));
        }
      };

      request.onerror = (event) => {
        console.error("Error getting annotation:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Get all annotations
   * @returns {Promise<Array>} Array of annotation objects
   */
  async getAllAnnotations() {
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
        const annotations = event.target.result;

        // Convert dateCreated strings back to Date objects
        annotations.forEach((annotation) => {
          if (typeof annotation.dateCreated === "string") {
            annotation.dateCreated = new Date(annotation.dateCreated);
          }
        });

        resolve(annotations);
      };

      request.onerror = (event) => {
        console.error("Error getting annotations:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Get annotations for a specific file
   * @param {number} fileId - The ID of the file
   * @returns {Promise<Array>} Array of annotation objects for the file
   */
  async getAnnotationsByFile(fileId) {
    if (!this.db) {
      await this.initIndexedDB();
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        [this.config.storeName],
        "readonly"
      );
      const store = transaction.objectStore(this.config.storeName);
      const index = store.index("fileId");
      const request = index.getAll(fileId);

      request.onsuccess = (event) => {
        const annotations = event.target.result;

        // Convert dateCreated strings back to Date objects
        annotations.forEach((annotation) => {
          if (typeof annotation.dateCreated === "string") {
            annotation.dateCreated = new Date(annotation.dateCreated);
          }
        });

        resolve(annotations);
      };

      request.onerror = (event) => {
        console.error("Error getting file annotations:", event.target.error);
        reject(event.target.error);
      };
    });
  }

  /**
   * Search for annotations by content or selected text
   * @param {string} query - The search query
   * @returns {Promise<Array>} Array of matching annotation objects
   */
  async searchAnnotations(query) {
    const allAnnotations = await this.getAllAnnotations();

    // Simple search implementation - can be improved for better performance
    // with a proper full-text search index in IndexedDB
    const searchTerms = query.toLowerCase().split(" ");

    return allAnnotations.filter((annotation) => {
      const content = annotation.content.toLowerCase();
      const selectedText = annotation.anchor.text.toLowerCase();

      // Check if any search term is found in either content or selected text
      return searchTerms.some(
        (term) => content.includes(term) || selectedText.includes(term)
      );
    });
  }

  /**
   * Search for annotations by tag
   * @param {string} tag - The tag to search for
   * @returns {Promise<Array>} Array of annotation objects with the specified tag
   */
  async searchAnnotationsByTag(tag) {
    const allAnnotations = await this.getAllAnnotations();

    // Filter annotations that have the specified tag
    return allAnnotations.filter((annotation) => {
      // Check if the annotation has tags
      if (!annotation.tags || !Array.isArray(annotation.tags)) {
        return false;
      }

      // Check if the tag exists in the annotation's tags array
      return annotation.tags.some(
        (annotationTag) => annotationTag.toLowerCase() === tag.toLowerCase()
      );
    });
  }

  /**
   * Delete an annotation by ID
   * @param {string} id - The ID of the annotation to delete
   * @returns {Promise<void>}
   */
  async deleteAnnotation(id) {
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
        this.showStatus("success", "Annotation deleted successfully");
        resolve();
      };

      request.onerror = (event) => {
        console.error("Error deleting annotation:", event.target.error);
        this.showStatus(
          "error",
          `Failed to delete annotation: ${event.target.error.message}`
        );
        reject(event.target.error);
      };
    });
  }

  /**
   * Clear all annotations from the database
   * @returns {Promise<void>}
   */
  async clearAnnotations() {
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
        this.showStatus("success", "All annotations cleared successfully");
        resolve();
      };

      request.onerror = (event) => {
        console.error("Error clearing annotations:", event.target.error);
        this.showStatus(
          "error",
          `Failed to clear annotations: ${event.target.error.message}`
        );
        reject(event.target.error);
      };
    });
  }

  /**
   * Diagnostic function to dump all annotation data to console
   * Useful for debugging and troubleshooting
   * @returns {Promise<Array>} Array of all annotation objects with details
   */
  async diagnosticDumpData() {
    if (!this.db) {
      await this.initIndexedDB();
    }

    try {
      const annotations = await this.getAllAnnotations();

      console.log("===== ANNOTATION DATABASE DIAGNOSTIC DUMP =====");
      console.log(`Total annotations: ${annotations.length}`);

      annotations.forEach((annotation, index) => {
        console.log(`\nAnnotation #${index + 1} - ID: ${annotation.id}`);
        console.log(`File: ${annotation.filePath}`);
        console.log(`Date: ${annotation.dateCreated}`);
        console.log(`Content: ${annotation.content}`);

        // Show tags if they exist
        if (annotation.tags && Array.isArray(annotation.tags)) {
          console.log(`Tags: ${annotation.tags.join(", ")}`);
        }

        console.log("Anchor Data");
        console.log(`Text: ${annotation.anchor?.text || ""}`);
        console.log(`Context: ${annotation.anchor?.context || ""}`);

        if (
          !annotation.anchor?.text ||
          annotation.anchor.text.trim().length === 0
        ) {
          console.log("🚨 MISSING ANCHOR TEXT");
        }

        if (
          !annotation.anchor?.context ||
          annotation.anchor.context.trim().length === 0
        ) {
          console.log("⚠️ MISSING CONTEXT");
        }

        console.log(`Element Path: ${annotation.anchor?.elementPath || "N/A"}`);

        if (annotation.anchor?.elementPath) {
          const pathParts = annotation.anchor.elementPath.split(" > ");
          console.log(`📊 Anchor path depth: ${pathParts.length} elements`);
        }

        console.log("---");
      });

      console.log("===== END DIAGNOSTIC DUMP =====");

      return annotations;
    } catch (error) {
      console.error("Diagnostic dump error:", error);
      return [];
    }
  }

  /**
   * Clear problematic annotations (ones with empty text or context)
   * @returns {Promise<number>} Number of annotations fixed/deleted
   */
  async clearProblematicAnnotations() {
    if (!this.db) {
      await this.initIndexedDB();
    }

    try {
      // Get all annotations
      const allAnnotations = await this.getAllAnnotations();

      // Filter for problematic ones
      const problematic = allAnnotations.filter((annotation) => {
        // Check for missing or empty anchor data
        return (
          !annotation.anchor ||
          !annotation.anchor.text ||
          annotation.anchor.text.trim().length === 0
        );
      });

      if (problematic.length === 0) {
        this.showStatus("info", "No problematic annotations found");
        return 0;
      }

      // Delete each problematic annotation
      let deletedCount = 0;
      for (const annotation of problematic) {
        try {
          await this.deleteAnnotation(annotation.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete annotation ${annotation.id}:`, error);
        }
      }

      this.showStatus(
        "success",
        `Removed ${deletedCount} problematic annotations`
      );
      return deletedCount;
    } catch (error) {
      console.error("Error clearing problematic annotations:", error);
      this.showStatus("error", `Error: ${error.message}`);
      return 0;
    }
  }

  /**
   * Retrieve all unique tags from annotations.
   * @returns {Promise<string[]>} A promise that resolves with an array of unique tags.
   */
  async getAllTags() {
    return new Promise(async (resolve, reject) => {
      if (!this.db) {
        await this.initIndexedDB(); // Ensure DB is initialized
      }

      if (!this.db) {
        return reject(new Error("Database not initialized."));
      }

      const transaction = this.db.transaction(["annotations"], "readonly");
      const store = transaction.objectStore("annotations");
      const request = store.getAll();

      request.onerror = (event) => {
        console.error(
          "Error fetching annotations for tags:",
          event.target.error
        );
        reject(event.target.error);
      };

      request.onsuccess = (event) => {
        const annotations = event.target.result;
        const uniqueTags = new Set();
        annotations.forEach((annotation) => {
          if (annotation.tags && Array.isArray(annotation.tags)) {
            annotation.tags.forEach((tag) => uniqueTags.add(tag));
          }
        });
        resolve(Array.from(uniqueTags).sort()); // Return sorted unique tags
      };
    });
  }

  // Close the database connection (optional, depends on app lifecycle)
  close() {
    // ... existing code ...
  }
}
