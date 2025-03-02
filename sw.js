// sw.js - Enhanced version with better PWA support

// Version control - use a timestamp to force update when deploying new versions
const VERSION =
  "1.1.0-" + new Date().toISOString().slice(0, 10).replace(/-/g, "");

// Cache names with versioning
const CACHE_NAMES = {
  static: `magpie-static-${VERSION}`,
  markdown: `magpie-content-${VERSION}`,
  images: `magpie-images-${VERSION}`,
  assets: `magpie-assets-${VERSION}`,
  offline: `magpie-offline-${VERSION}`,
};

// Resources that must be cached for offline functionality
const STATIC_RESOURCES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/offline.html",
  "/static/css/main.css",
  "/static/js/main.js",
  // PWA icons
  "/icons/icon-72x72.png",
  "/icons/icon-96x96.png",
  "/icons/icon-128x128.png",
  "/icons/icon-144x144.png",
  "/icons/icon-152x152.png",
  "/icons/icon-167x167.png",
  "/icons/icon-180x180.png",
  "/icons/icon-192x192.png",
  "/icons/icon-384x384.png",
  "/icons/icon-512x512.png",
];

// Install event - cache core resources
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing version:", VERSION);

  event.waitUntil(
    Promise.all([
      // Cache static resources
      caches.open(CACHE_NAMES.static).then((cache) => {
        console.log("[Service Worker] Caching static resources");
        return cache.addAll(STATIC_RESOURCES);
      }),
      // Cache offline page
      caches.open(CACHE_NAMES.offline).then((cache) => {
        return cache.add("/offline.html");
      }),
    ]).then(() => {
      console.log("[Service Worker] Install completed");
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating new version:", VERSION);

  event.waitUntil(
    // Clean up old caches
    caches
      .keys()
      .then((keys) => {
        return Promise.all(
          keys.map((key) => {
            // Check if this is an old version of our caches
            const isOldCache = Object.values(CACHE_NAMES).every(
              (cacheName) => key !== cacheName
            );
            if (isOldCache) {
              console.log("[Service Worker] Removing old cache:", key);
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        );
      })
      .then(() => {
        console.log("[Service Worker] Activate completed");
        // Take control of all clients immediately
        return self.clients.claim();
      })
  );
});

// Helper to determine resource type
function getResourceType(request) {
  const url = new URL(request.url);

  if (request.mode === "navigate") {
    return "navigation";
  } else if (STATIC_RESOURCES.includes(url.pathname)) {
    return "static";
  } else if (url.pathname.endsWith(".md")) {
    return "markdown";
  } else if (
    url.pathname.endsWith(".jpg") ||
    url.pathname.endsWith(".jpeg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".gif") ||
    url.pathname.endsWith(".svg")
  ) {
    return "image";
  } else if (
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.hostname === "cdnjs.cloudflare.com"
  ) {
    return "asset";
  }

  // API requests
  if (url.pathname.startsWith("/api/")) {
    return "api";
  }

  return "other";
}

// Enhanced stale-while-revalidate strategy
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);

  // Try to get from cache first
  const cachedResponse = await cache.match(request);

  // Fetch from network and update cache in the background
  const fetchPromise = fetch(request)
    .then(async (networkResponse) => {
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    })
    .catch((error) => {
      console.log("[Service Worker] Network fetch failed:", error);
      return new Response("Network error", {status: 408});
    });

  // Return the cached response if we have one, otherwise wait for the network
  return cachedResponse || fetchPromise;
}

// Enhanced network-first strategy with timeout
async function networkFirstWithTimeout(request, cacheName, timeout = 3000) {
  try {
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise((_, reject) => {
      setTimeout(() => reject(new Error("Network timeout")), timeout);
    });

    // Try network first with timeout
    const networkResponse = await Promise.race([
      fetch(request),
      timeoutPromise,
    ]);

    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log("[Service Worker] Network first failed:", error);
  }

  // Fall back to cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // If neither network nor cache works, return appropriate fallback
  if (request.mode === "navigate") {
    return caches.match("/offline.html");
  }

  return new Response("Network error", {status: 408});
}

// Cache-first strategy with network fallback
async function cacheFirst(request, cacheName) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(cacheName);
    await cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch (error) {
    console.log(
      "[Service Worker] Cache first & network fallback failed:",
      error
    );

    // Return a placeholder for images
    if (request.destination === "image") {
      return new Response(
        '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ddd"/><text x="50%" y="50%" fill="#888" text-anchor="middle">Image</text></svg>',
        {headers: {"Content-Type": "image/svg+xml"}}
      );
    }

    return new Response("Resource unavailable", {status: 404});
  }
}

// Handle fetch events
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const resourceType = getResourceType(event.request);

  switch (resourceType) {
    case "navigation":
      // Network-first strategy with timeout for navigation
      event.respondWith(
        networkFirstWithTimeout(event.request, CACHE_NAMES.static)
      );
      break;

    case "markdown":
      // Stale-while-revalidate for markdown content
      event.respondWith(
        staleWhileRevalidate(event.request, CACHE_NAMES.markdown)
      );
      break;

    case "static":
    case "asset":
      // Cache-first strategy for static assets
      event.respondWith(cacheFirst(event.request, CACHE_NAMES.static));
      break;

    case "image":
      // Cache-first strategy with fallback for images
      event.respondWith(cacheFirst(event.request, CACHE_NAMES.images));
      break;

    case "api":
      // Network-only for API requests, but don't cache
      event.respondWith(
        fetch(event.request).catch(
          () =>
            new Response(JSON.stringify({error: "Network unavailable"}), {
              status: 503,
              headers: {"Content-Type": "application/json"},
            })
        )
      );
      break;

    default:
      // Network-first strategy for other requests
      event.respondWith(
        networkFirstWithTimeout(event.request, CACHE_NAMES.static)
      );
  }
});

// Background sync for annotations
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-annotations") {
    event.waitUntil(syncAnnotations());
  }
});

// Periodic background sync for content updates
self.addEventListener("periodicsync", (event) => {
  if (event.tag === "refresh-content") {
    event.waitUntil(refreshContent());
  }
});

// Sync annotations when back online
async function syncAnnotations() {
  try {
    // Get pending annotations from IndexedDB
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("markdownDB", 3);
      request.onerror = reject;
      request.onsuccess = (event) => resolve(event.target.result);
    });

    // Process any pending annotations here
    console.log("[Service Worker] Syncing annotations");

    // Implementation would depend on your app's specific sync needs

    return true;
  } catch (error) {
    console.error("[Service Worker] Annotation sync failed:", error);
    return false;
  }
}

// Refresh content in the background
async function refreshContent() {
  console.log("[Service Worker] Background refresh started");
  // This would fetch updated content based on user's reading list or similar
  // Implementation depends on app-specific needs
}

// Listen for messages from clients
self.addEventListener("message", (event) => {
  const message = event.data;

  if (message.type === "skipWaiting") {
    self.skipWaiting();
  }

  if (message.type === "sync") {
    syncAnnotations().then((result) => {
      event.ports[0].postMessage({
        type: "syncComplete",
        success: result,
      });
    });
  }
});

// Check for connectivity changes to trigger syncs
self.addEventListener("online", () => {
  self.registration.sync.register("sync-annotations").catch((err) => {
    console.error("Background sync registration failed:", err);
  });
});
