// src/services/AnnotationService.js
import {getDatabaseService} from "./DatabaseService";

let instance = null;
let initPromise = null;

class AnnotationService {
  constructor() {
    this.initialized = false;
    this.initPromise = null;
  }

  async initialize() {
    if (this.initialized) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    console.log("AnnotationService: Starting initialization");

    this.initPromise = getDatabaseService().then((dbService) => {
      this.db = dbService.db;
      this.initialized = true;
      console.log("AnnotationService: Database opened successfully");
      return;
    });

    return this.initPromise;
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
    await this.initialize();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(["annotations"], "readwrite");
        const store = transaction.objectStore("annotations");

        const annotationWithTimestamp = {
          ...annotation,
          created: new Date().toISOString(),
          updated: new Date().toISOString(),
        };

        const request = store.add(annotationWithTimestamp);

        request.onsuccess = (event) => {
          const id = event.target.result;
          resolve({...annotationWithTimestamp, id});
        };

        request.onerror = (event) => {
          reject(new Error("Failed to add annotation"));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async getAnnotationsForArticle(articleId) {
    await this.initialize();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(["annotations"], "readonly");
        const store = transaction.objectStore("annotations");
        const index = store.index("articleId");

        const request = index.getAll(articleId);

        request.onsuccess = (event) => {
          resolve(event.target.result || []);
        };

        request.onerror = (event) => {
          reject(new Error("Failed to get annotations"));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async getAnnotationsForParagraph(articleId, paragraphIndex) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["annotations"], "readonly");
      const store = transaction.objectStore("annotations");
      const index = store.index("articleId");

      transaction.onerror = (event) => {
        console.error(
          "AnnotationService: Error getting paragraph annotations:",
          event.target.error
        );
        reject(new Error("Failed to get annotations"));
      };

      const request = index.getAll(articleId);

      request.onsuccess = () => {
        const annotations = request.result.filter(
          (a) => a.paragraphIndex === paragraphIndex
        );
        console.log(
          `Retrieved ${annotations.length} annotations for paragraph ${paragraphIndex}`
        );
        resolve(annotations);
      };
    });
  }

  async trackParagraph(articleId, text, index) {
    await this.initialize();

    if (!this.db) {
      throw new Error("Database not initialized");
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db.transaction(["paragraphs"], "readwrite");
        const store = transaction.objectStore("paragraphs");

        // First check if paragraph already exists
        const articleIndex = store.index("articleId");
        const request = articleIndex.openCursor(IDBKeyRange.only(articleId));

        let exists = false;

        request.onsuccess = (event) => {
          const cursor = event.target.result;

          if (cursor) {
            const paragraph = cursor.value;

            if (paragraph.index === index && paragraph.text === text) {
              exists = true;
              resolve(paragraph.id); // Paragraph already tracked
              return;
            }

            cursor.continue();
          } else {
            // Not found, add new paragraph
            if (!exists) {
              const addRequest = store.add({
                articleId,
                text,
                index,
                tracked: new Date().toISOString(),
              });

              addRequest.onsuccess = (event) => {
                resolve(event.target.result);
              };

              addRequest.onerror = (event) => {
                reject(new Error("Failed to track paragraph"));
              };
            }
          }
        };

        request.onerror = (event) => {
          reject(new Error("Failed to check paragraph existence"));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  async findParagraphByHash(hash) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["paragraphs"], "readonly");
      const store = transaction.objectStore("paragraphs");
      const index = store.index("hash");

      transaction.onerror = (event) => {
        console.error(
          "AnnotationService: Error finding paragraph:",
          event.target.error
        );
        reject(new Error("Failed to find paragraph"));
      };

      const request = index.get(hash);

      request.onsuccess = () => {
        resolve(request.result);
      };
    });
  }

  async deleteAnnotation(id) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["annotations"], "readwrite");
      const store = transaction.objectStore("annotations");

      transaction.oncomplete = () => {
        console.log(`Annotation ${id} deleted successfully`);
        resolve();
      };

      transaction.onerror = (event) => {
        console.error(
          "AnnotationService: Error deleting annotation:",
          event.target.error
        );
        reject(new Error("Failed to delete annotation"));
      };

      // Delete the annotation
      store.delete(id);
    });
  }

  async updateAnnotation(id, changes) {
    return new Promise((resolve, reject) => {
      const transaction = this.db.transaction(["annotations"], "readwrite");
      const store = transaction.objectStore("annotations");

      transaction.oncomplete = () => {
        console.log(`Annotation ${id} updated successfully`);
        resolve();
      };

      transaction.onerror = (event) => {
        console.error(
          "AnnotationService: Error updating annotation:",
          event.target.error
        );
        reject(new Error("Failed to update annotation"));
      };

      // First get the existing annotation
      const getRequest = store.get(id);

      getRequest.onsuccess = () => {
        const annotation = getRequest.result;
        if (!annotation) {
          reject(new Error(`Annotation ${id} not found`));
          return;
        }

        // Update the annotation
        const updatedAnnotation = {
          ...annotation,
          ...changes,
          updatedAt: new Date().toISOString(),
        };

        // Put the updated annotation
        store.put(updatedAnnotation);
      };

      getRequest.onerror = (event) => {
        console.error(
          "AnnotationService: Error getting annotation:",
          event.target.error
        );
        // Will also trigger transaction.onerror
      };
    });
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
