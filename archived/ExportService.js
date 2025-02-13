// src/services/ExportService.js

class ExportService {
  constructor() {
    this.dbName = "markdownDB";
  }

  async exportData() {
    const db = await this.openDatabase();
    const data = {
      version: 1,
      timestamp: new Date().toISOString(),
      stores: {},
    };

    // Get all object store names
    const storeNames = Array.from(db.objectStoreNames);

    // Export data from each store
    for (const storeName of storeNames) {
      data.stores[storeName] = await this.getAllFromStore(db, storeName);
    }

    return data;
  }

  openDatabase() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName);

      request.onerror = () => reject(new Error("Failed to open database"));
      request.onsuccess = () => resolve(request.result);
    });
  }

  getAllFromStore(db, storeName) {
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(storeName, "readonly");
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onerror = () =>
        reject(new Error(`Failed to get data from ${storeName}`));
      request.onsuccess = () => resolve(request.result);
    });
  }

  downloadJSON(data, filename = "markdown-reader-backup.json") {
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], {type: "application/json"});
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = filename;

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }

  async exportAndDownload() {
    try {
      const data = await this.exportData();
      const filename = `markdown-reader-backup-${
        new Date().toISOString().split("T")[0]
      }.json`;
      this.downloadJSON(data, filename);
      return true;
    } catch (error) {
      console.error("Export failed:", error);
      throw error;
    }
  }
}

const exportService = new ExportService();
export default exportService;
