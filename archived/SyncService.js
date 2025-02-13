// src/services/SyncService.js

class SyncService {
  constructor() {
    this.dbName = "markdownDB";
    this.version = 1;
    this.db = null;
    this.syncQueue = [];
    this.isOnline = navigator.onLine;

    // Listen for online/offline events
    window.addEventListener("online", this.handleOnlineStatus.bind(this));
    window.addEventListener("offline", this.handleOnlineStatus.bind(this));
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

        // Articles store with sync metadata
        if (!db.objectStoreNames.contains("articles")) {
          const articlesStore = db.createObjectStore("articles", {
            keyPath: "id",
            autoIncrement: true,
          });
          articlesStore.createIndex("title", "title", {unique: false});
          articlesStore.createIndex("filePath", "filePath", {unique: true});
          articlesStore.createIndex("lastModified", "lastModified", {
            unique: false,
          });
          articlesStore.createIndex("syncStatus", "syncStatus", {
            unique: false,
          });
        }

        // Sync queue store
        if (!db.objectStoreNames.contains("syncQueue")) {
          const syncStore = db.createObjectStore("syncQueue", {
            keyPath: "id",
            autoIncrement: true,
          });
          syncStore.createIndex("timestamp", "timestamp", {unique: false});
          syncStore.createIndex("type", "type", {unique: false});
        }
      };
    });
  }

  handleOnlineStatus = async () => {
    this.isOnline = navigator.onLine;
    if (this.isOnline) {
      await this.processSyncQueue();
    }
  };

  async addToSyncQueue(action) {
    const transaction = this.db.transaction(["syncQueue"], "readwrite");
    const store = transaction.objectStore("syncQueue");

    const syncItem = {
      ...action,
      timestamp: new Date().toISOString(),
      attempts: 0,
    };

    await store.add(syncItem);

    if (this.isOnline) {
      await this.processSyncQueue();
    }
  }

  async processSyncQueue() {
    const transaction = this.db.transaction(["syncQueue"], "readwrite");
    const store = transaction.objectStore("syncQueue");
    const items = await store.getAll();

    for (const item of items) {
      try {
        await this.syncItem(item);
        await store.delete(item.id);
      } catch (error) {
        console.error("Sync failed for item:", item, error);
        // Update retry count and timestamp
        item.attempts += 1;
        item.timestamp = new Date().toISOString();
        if (item.attempts < 3) {
          // Max retry attempts
          await store.put(item);
        }
      }
    }
  }

  async syncItem(item) {
    const API_URL = process.env.REACT_APP_API_URL || "http://localhost:3001";

    switch (item.type) {
      case "CREATE_ARTICLE":
      case "UPDATE_ARTICLE": {
        const response = await fetch(`${API_URL}/articles`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(item.data),
        });

        if (!response.ok) throw new Error("Sync failed");
        break;
      }

      case "DELETE_ARTICLE": {
        const response = await fetch(`${API_URL}/articles/${item.data.id}`, {
          method: "DELETE",
        });

        if (!response.ok) throw new Error("Sync failed");
        break;
      }
    }
  }

  async addArticle(article) {
    const transaction = this.db.transaction(["articles"], "readwrite");
    const store = transaction.objectStore("articles");

    const articleWithMeta = {
      ...article,
      lastModified: new Date().toISOString(),
      syncStatus: "pending",
    };

    const id = await store.add(articleWithMeta);

    await this.addToSyncQueue({
      type: "CREATE_ARTICLE",
      data: articleWithMeta,
    });

    return id;
  }

  async getArticles() {
    const transaction = this.db.transaction(["articles"], "readonly");
    const store = transaction.objectStore("articles");
    return await store.getAll();
  }

  async updateArticle(id, changes) {
    const transaction = this.db.transaction(["articles"], "readwrite");
    const store = transaction.objectStore("articles");

    const article = await store.get(id);
    const updatedArticle = {
      ...article,
      ...changes,
      lastModified: new Date().toISOString(),
      syncStatus: "pending",
    };

    await store.put(updatedArticle);

    await this.addToSyncQueue({
      type: "UPDATE_ARTICLE",
      data: updatedArticle,
    });
  }

  async deleteArticle(id) {
    const transaction = this.db.transaction(["articles"], "readwrite");
    const store = transaction.objectStore("articles");

    await store.delete(id);

    await this.addToSyncQueue({
      type: "DELETE_ARTICLE",
      data: {id},
    });
  }
}

const syncService = new SyncService();
export default syncService;
