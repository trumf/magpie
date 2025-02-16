// sw.js

// Version control for cache updates
const VERSION = "1.0.0";

// Cache names with versioning
const CACHE_NAMES = {
  static: `magpie-static-${VERSION}`,
  markdown: `magpie-content-${VERSION}`,
  images: `magpie-images-${VERSION}`,
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

  return "other";
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

// Handle fetch events
self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const resourceType = getResourceType(event.request);

  switch (resourceType) {
    case "navigation":
    case "markdown":
      // Network-first strategy with timeout for navigation and markdown
      event.respondWith(
        networkFirstWithTimeout(event.request, CACHE_NAMES.markdown)
      );
      break;

    case "static":
    case "asset":
      // Cache-first strategy for static assets
      event.respondWith(
        caches.match(event.request).then(
          (response) =>
            response ||
            fetch(event.request).then((fetchResponse) => {
              const cache = caches.open(CACHE_NAMES.static);
              cache.then((cache) =>
                cache.put(event.request, fetchResponse.clone())
              );
              return fetchResponse;
            })
        )
      );
      break;

    case "image":
      // Cache-first strategy with fallback for images
      event.respondWith(
        caches.match(event.request).then(
          (response) =>
            response ||
            fetch(event.request)
              .then((fetchResponse) => {
                const cache = caches.open(CACHE_NAMES.images);
                cache.then((cache) =>
                  cache.put(event.request, fetchResponse.clone())
                );
                return fetchResponse;
              })
              .catch(
                () =>
                  new Response(
                    '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ddd"/></svg>',
                    {headers: {"Content-Type": "image/svg+xml"}}
                  )
              )
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

// Listen for messages from clients
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
