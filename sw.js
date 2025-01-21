const CACHE_NAMES = {
  static: "static-cache-v1",
  dynamic: "dynamic-cache-v1",
  offline: "offline-cache-v1",
};

// Core resources that must be cached
const STATIC_RESOURCES = [
  "/",
  "/index.html",
  "/manifest.json",
  "/offline.html",
];

// Install event - cache core resources
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing");

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
  console.log("[Service Worker] Activating");

  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((keys) => {
        return Promise.all(
          keys.map((key) => {
            if (!Object.values(CACHE_NAMES).includes(key)) {
              console.log("[Service Worker] Removing old cache:", key);
              return caches.delete(key);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim(),
    ])
  );
});

// Fetch event - handle offline access
self.addEventListener("fetch", (event) => {
  // Skip non-GET requests
  if (event.request.method !== "GET") return;

  // Get the URL for easier matching
  const url = new URL(event.request.url);

  // Handle different types of requests
  if (event.request.mode === "navigate") {
    // Handle navigation requests (HTML pages)
    event.respondWith(handleNavigationRequest(event.request));
  } else if (
    // Handle build assets (JS, CSS)
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    // Also cache assets from CDNs we're using
    url.hostname === "cdnjs.cloudflare.com"
  ) {
    event.respondWith(handleAssetRequest(event.request));
  } else if (event.request.destination === "image") {
    // Handle image requests
    event.respondWith(handleImageRequest(event.request));
  } else {
    // Handle all other requests
    event.respondWith(handleResourceRequest(event.request));
  }
});

// Handle navigation requests
async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.dynamic);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log("[Service Worker] Navigation fetch failed:", error);
  }

  // If network fails, try cache
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  // If both fail, show offline page
  return caches.match("/offline.html");
}

// Handle build assets (JS, CSS) with cache-first strategy
async function handleAssetRequest(request) {
  // Try cache first
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    // If not in cache, get from network
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.static);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log("[Service Worker] Asset fetch failed:", error);
  }

  // If both cache and network fail, return error
  return new Response("Failed to load asset", {status: 404});
}

// Handle image requests
async function handleImageRequest(request) {
  const cachedResponse = await caches.match(request);
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(CACHE_NAMES.dynamic);
      await cache.put(request, networkResponse.clone());
      return networkResponse;
    }
  } catch (error) {
    console.log("[Service Worker] Image fetch failed:", error);
  }

  // Return placeholder for failed images
  return new Response(
    '<svg width="100" height="100" xmlns="http://www.w3.org/2000/svg"><rect width="100%" height="100%" fill="#ddd"/></svg>',
    {headers: {"Content-Type": "image/svg+xml"}}
  );
}

// Handle other resources
async function handleResourceRequest(request) {
  const cachedResponse = await caches.match(request);

  const networkResponsePromise = fetch(request)
    .then(async (response) => {
      if (response.ok) {
        const cache = await caches.open(CACHE_NAMES.dynamic);
        await cache.put(request, response.clone());
      }
      return response;
    })
    .catch((error) => {
      console.log("[Service Worker] Resource fetch failed:", error);
      return null;
    });

  if (cachedResponse) {
    return cachedResponse;
  }

  const networkResponse = await networkResponsePromise;
  if (networkResponse) {
    return networkResponse;
  }

  return new Response("Network error", {status: 408});
}

// Listen for messages from the client
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
