// src/services/DatabaseService.js

// services/DatabaseService.js
class DatabaseService {
  constructor() {
    this.dbName = "readerDB";
    this.version = 1;
    this.db = null;
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

        if (!db.objectStoreNames.contains("annotations")) {
          const store = db.createObjectStore("annotations", {
            keyPath: "id",
            autoIncrement: true,
          });
          store.createIndex("articleId", "articleId", {unique: false});
          store.createIndex("createdAt", "createdAt", {unique: false});
        }
      };
    });
  }

  async addAnnotation(annotation) {
    const store = this.db
      .transaction(["annotations"], "readwrite")
      .objectStore("annotations");

    return await store.add({
      ...annotation,
      createdAt: new Date().toISOString(),
    });
  }

  async getAnnotations(articleId) {
    const store = this.db
      .transaction(["annotations"], "readonly")
      .objectStore("annotations");

    return new Promise((resolve, reject) => {
      const request = store.index("articleId").getAll(articleId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Failed to get annotations"));
    });
  }
}

let instance = null;

export const getDatabase = async () => {
  if (!instance) {
    instance = new DatabaseService();
    await instance.initialize();
  }
  return instance;
};

/* 
class DatabaseService {
  constructor() {
    this.dbName = "markdownDB";
    this.version = 1;
    this.db = null;
  }

  async initialize() {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.version);

      request.onerror = () => {
        reject(new Error("Failed to open database"));
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        // Create articles store
        if (!db.objectStoreNames.contains("articles")) {
          const articlesStore = db.createObjectStore("articles", {
            keyPath: "id",
            autoIncrement: true,
          });
          articlesStore.createIndex("title", "title", {unique: false});
          articlesStore.createIndex("filePath", "filePath", {unique: true});
        }

        // Create images store
        if (!db.objectStoreNames.contains("images")) {
          const imagesStore = db.createObjectStore("images", {
            keyPath: "id",
            autoIncrement: true,
          });
          imagesStore.createIndex("articleId", "articleId", {unique: false});
          imagesStore.createIndex("filePath", "filePath", {unique: true});
        }
      };
    });
  }

  async addArticle(article) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["articles"], "readwrite");
      const store = transaction.objectStore("articles");

      const request = store.add(article);

      request.onsuccess = () => {
        resolve(request.result); // Returns the generated ID
      };

      request.onerror = () => {
        reject(new Error("Failed to add article"));
      };
    });
  }

  async addImage(image) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["images"], "readwrite");
      const store = transaction.objectStore("images");

      const request = store.add(image);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error("Failed to add image"));
      };
    });
  }

  async getArticles() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["articles"], "readonly");
      const store = transaction.objectStore("articles");
      const request = store.getAll();

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error("Failed to get articles"));
      };
    });
  }

  async getImagesForArticle(articleId) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["images"], "readonly");
      const store = transaction.objectStore("images");
      const index = store.index("articleId");
      const request = index.getAll(articleId);

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(new Error("Failed to get images"));
      };
    });
  }

  async clearDatabase() {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(
        ["articles", "images"],
        "readwrite"
      );

      transaction.onerror = () => {
        reject(new Error("Failed to clear database"));
      };

      transaction.oncomplete = () => {
        resolve();
      };

      const articlesStore = transaction.objectStore("articles");
      const imagesStore = transaction.objectStore("images");

      articlesStore.clear();
      imagesStore.clear();
    });
  }
}

const databaseService = new DatabaseService();
export default databaseService;
*/
