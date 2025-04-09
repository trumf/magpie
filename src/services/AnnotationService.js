// src/services/AnnotationService.js

let instance = null;

class AnnotationService {
  constructor() {
    this.dbName = "markdownDB";
    this.version = 3;
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

        // Create annotations store
        if (!db.objectStoreNames.contains("annotations")) {
          const annotationsStore = db.createObjectStore("annotations", {
            keyPath: "id",
            autoIncrement: true,
          });

          // Indexes for querying
          annotationsStore.createIndex("articleId", "articleId", {
            unique: false,
          });
          annotationsStore.createIndex("paragraphIndex", "paragraphIndex", {
            unique: false,
          });
          annotationsStore.createIndex("createdAt", "createdAt", {
            unique: false,
          });
          annotationsStore.createIndex("type", "type", {unique: false});
        }

        // Create paragraphs store for tracking selected paragraphs
        if (!db.objectStoreNames.contains("paragraphs")) {
          const paragraphsStore = db.createObjectStore("paragraphs", {
            keyPath: "id",
            autoIncrement: true,
          });

          paragraphsStore.createIndex("articleId", "articleId", {
            unique: false,
          });
          paragraphsStore.createIndex("index", "index", {unique: false});
          paragraphsStore.createIndex("hash", "hash", {unique: false});
        }
      };
    });
  }

  generateParagraphHash(text) {
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }

  async addAnnotation(annotation) {
    const transaction = this.db.transaction(["annotations"], "readwrite");
    const store = transaction.objectStore("annotations");

    const annotationWithMeta = {
      ...annotation,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return await store.add(annotationWithMeta);
  }

  async getAnnotationsForArticle(articleId) {
    const transaction = this.db.transaction(["annotations"], "readonly");
    const store = transaction.objectStore("annotations");
    const index = store.index("articleId");

    return new Promise((resolve, reject) => {
      const request = index.getAll(articleId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Failed to get annotations"));
    });
  }

  async getAnnotationsForParagraph(articleId, paragraphIndex) {
    const transaction = this.db.transaction(["annotations"], "readonly");
    const store = transaction.objectStore("annotations");
    const index = store.index("articleId");

    return new Promise((resolve, reject) => {
      const request = index.getAll(articleId);

      request.onsuccess = () => {
        const annotations = request.result.filter(
          (a) => a.paragraphIndex === paragraphIndex
        );
        resolve(annotations);
      };

      request.onerror = () => reject(new Error("Failed to get annotations"));
    });
  }

  async trackParagraph(articleId, paragraphText, index) {
    const transaction = this.db.transaction(["paragraphs"], "readwrite");
    const store = transaction.objectStore("paragraphs");

    const paragraph = {
      articleId,
      text: paragraphText,
      index,
      hash: this.generateParagraphHash(paragraphText),
      createdAt: new Date().toISOString(),
    };

    return await store.add(paragraph);
  }

  async findParagraphByHash(hash) {
    const transaction = this.db.transaction(["paragraphs"], "readonly");
    const store = transaction.objectStore("paragraphs");
    const index = store.index("hash");

    return new Promise((resolve, reject) => {
      const request = index.get(hash);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(new Error("Failed to find paragraph"));
    });
  }

  async deleteAnnotation(id) {
    const transaction = this.db.transaction(["annotations"], "readwrite");
    const store = transaction.objectStore("annotations");
    return await store.delete(id);
  }

  async updateAnnotation(id, changes) {
    const transaction = this.db.transaction(["annotations"], "readwrite");
    const store = transaction.objectStore("annotations");

    const annotation = await store.get(id);
    const updatedAnnotation = {
      ...annotation,
      ...changes,
      updatedAt: new Date().toISOString(),
    };

    return await store.put(updatedAnnotation);
  }
}

export const getAnnotationService = async () => {
  if (!instance) {
    instance = new AnnotationService();
    await instance.initialize();
  }
  return instance;
};

export default getAnnotationService;
