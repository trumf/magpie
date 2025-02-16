// services/OfflineService.js
class OfflineService {
  constructor() {
    this.version = "1.0.0";
    this.cacheName = `magpie-content-${this.version}`;
  }

  async cacheMarkdownFile(file) {
    if (!("caches" in window)) {
      return false;
    }

    try {
      const cache = await caches.open(this.cacheName);
      const response = new Response(file.content, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Length": file.content.length.toString(),
          "X-File-Name": file.name,
          "X-File-Path": file.path,
        },
      });

      // Create a synthetic URL for the file
      const url = `/markdown/${encodeURIComponent(file.path)}`;
      await cache.put(url, response);

      return true;
    } catch (error) {
      console.error("Failed to cache markdown file:", error);
      return false;
    }
  }

  async getCachedFiles() {
    if (!("caches" in window)) {
      return [];
    }

    try {
      const cache = await caches.open(this.cacheName);
      const requests = await cache.keys();
      return requests
        .filter((request) => request.url.includes("/markdown/"))
        .map((request) => {
          const path = decodeURIComponent(request.url.split("/markdown/")[1]);
          return {
            path,
            name: path.split("/").pop(),
          };
        });
    } catch (error) {
      console.error("Failed to get cached files:", error);
      return [];
    }
  }

  async isCached(filePath) {
    if (!("caches" in window)) {
      return false;
    }

    try {
      const cache = await caches.open(this.cacheName);
      const url = `/markdown/${encodeURIComponent(filePath)}`;
      const response = await cache.match(url);
      return !!response;
    } catch (error) {
      console.error("Failed to check cache status:", error);
      return false;
    }
  }

  async removeCachedFile(filePath) {
    if (!("caches" in window)) {
      return false;
    }

    try {
      const cache = await caches.open(this.cacheName);
      const url = `/markdown/${encodeURIComponent(filePath)}`;
      return await cache.delete(url);
    } catch (error) {
      console.error("Failed to remove cached file:", error);
      return false;
    }
  }

  async clearCache() {
    if (!("caches" in window)) {
      return false;
    }

    try {
      return await caches.delete(this.cacheName);
    } catch (error) {
      console.error("Failed to clear cache:", error);
      return false;
    }
  }
}

const offlineService = new OfflineService();
export default offlineService;
