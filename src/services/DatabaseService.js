// Create a new DatabaseService.js file
class DatabaseService {
  constructor() {
    this.dbName = "markdownDB";
    this.version = 1;
    this.db = null;
    this.initialized = false;
    this.initPromise = null;
  }

  async initialize() {
    // If already initialized, return immediately
    if (this.initialized) {
      return Promise.resolve(this.db);
    }

    // If initialization is in progress, wait for it
    if (this.initPromise) {
      return this.initPromise;
    }

    console.log("DatabaseService: Starting database initialization");

    // Start initialization
    this.initPromise = new Promise((resolve, reject) => {
      try {
        const request = indexedDB.open(this.dbName, this.version);

        request.onerror = (event) => {
          console.error(
            "DatabaseService: Error opening database:",
            event.target.error
          );
          this.initPromise = null; // Reset so we can try again
          reject(new Error("Failed to open database"));
        };

        request.onblocked = (event) => {
          console.warn("DatabaseService: Database blocked:", event);
          // Try to close any existing connection
          if (this.db) {
            this.db.close();
          }
        };

        request.onsuccess = (event) => {
          console.log("DatabaseService: Database opened successfully");
          this.db = event.target.result;
          this.initialized = true;

          // Handle database connection errors
          this.db.onerror = (event) => {
            console.error(
              "DatabaseService: Database error:",
              event.target.error
            );
          };

          resolve(this.db);
        };

        request.onupgradeneeded = (event) => {
          console.log("DatabaseService: Upgrading database...");
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

          // Create assets store if it doesn't exist
          if (!db.objectStoreNames.contains("assets")) {
            const assetsStore = db.createObjectStore("assets", {
              keyPath: "id",
            });

            // Create indexes
            assetsStore.createIndex("originalPath", "originalPath", {
              unique: false,
            });
            assetsStore.createIndex("name", "name", {unique: false});
          }

          // Create annotations store if it doesn't exist
          if (!db.objectStoreNames.contains("annotations")) {
            const annotationsStore = db.createObjectStore("annotations", {
              keyPath: "id",
              autoIncrement: true,
            });

            // Create indexes
            annotationsStore.createIndex("articleId", "articleId", {
              unique: false,
            });
            annotationsStore.createIndex("paragraphIndex", "paragraphIndex", {
              unique: false,
            });
          }

          // Create paragraphs store if it doesn't exist
          if (!db.objectStoreNames.contains("paragraphs")) {
            const paragraphsStore = db.createObjectStore("paragraphs", {
              keyPath: "id",
              autoIncrement: true,
            });

            // Create indexes
            paragraphsStore.createIndex("articleId", "articleId", {
              unique: false,
            });
            paragraphsStore.createIndex("text", "text", {unique: false});
            paragraphsStore.createIndex("index", "index", {unique: false});
          }
        };
      } catch (error) {
        console.error("DatabaseService: Error during initialization:", error);
        this.initPromise = null;
        reject(error);
      }
    });

    return this.initPromise;
  }

  async getDB() {
    if (!this.initialized) {
      await this.initialize();
    }
    return this.db;
  }
}

// Create a singleton instance
let instance = null;

export const getDatabaseService = async () => {
  if (!instance) {
    instance = new DatabaseService();
    await instance.initialize();
  }
  return instance;
};

export default getDatabaseService;
