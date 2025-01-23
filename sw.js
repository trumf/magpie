// Customize this with your repository name if not served from root
const GITHUB_PAGES_PATH = "/magpie"; // e.g., '/markdown-reader'
const BASE_PATH = location.pathname.startsWith(GITHUB_PAGES_PATH)
  ? GITHUB_PAGES_PATH
  : "";

const CACHE_NAME = "Magpie";

// Add all routes and assets that need to be cached
const ASSETS_TO_CACHE = [
  BASE_PATH + "/",
  BASE_PATH + "/index.html",
  BASE_PATH + "/manifest.json",
  BASE_PATH + "/offline.html",
  BASE_PATH + "/404.html",
  // Add your app icons
  BASE_PATH + "/icon-192x192.png",
  BASE_PATH + "/icon-512x512.png",
];

// Installation - Cache core assets
self.addEventListener("install", (event) => {
  console.log("[Service Worker] Installing");

  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        console.log("[Service Worker] Caching core assets");
        return cache.addAll(ASSETS_TO_CACHE);
      })
      .then(() => {
        console.log("[Service Worker] Install completed");
        return self.skipWaiting();
      })
  );
});

// Activation - Clean up old caches
self.addEventListener("activate", (event) => {
  console.log("[Service Worker] Activating");

  event.waitUntil(
    Promise.all([
      caches.keys().then((keyList) => {
        return Promise.all(
          keyList.map((key) => {
            if (key !== CACHE_NAME) {
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

// GitHub Pages specific URL handling
function adjustGitHubPagesUrl(url) {
  const requestURL = new URL(url);
  // Handle case when deployed to GitHub Pages with repository name
  if (BASE_PATH && !requestURL.pathname.startsWith(BASE_PATH)) {
    return new Request(BASE_PATH + requestURL.pathname);
  }
  return new Request(url);
}

// Fetch event - Handle offline access and GitHub Pages routing
self.addEventListener("fetch", (event) => {
  // Only handle GET requests
  if (event.request.method !== "GET") return;

  const adjustedRequest = adjustGitHubPagesUrl(event.request.url);

  event.respondWith(
    // Try the cache first
    caches.match(adjustedRequest).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      // If not in cache, try network
      return fetch(event.request)
        .then((networkResponse) => {
          // Check if we received a valid response
          if (!networkResponse || networkResponse.status !== 200) {
            if (event.request.mode === "navigate") {
              // For navigation requests, return offline page
              return caches.match(BASE_PATH + "/offline.html");
            }
            return networkResponse;
          }

          // Clone the response before caching
          const responseToCache = networkResponse.clone();

          // Add to cache for future use
          caches.open(CACHE_NAME).then((cache) => {
            // Only cache same-origin requests
            if (event.request.url.startsWith(self.location.origin)) {
              cache.put(adjustedRequest, responseToCache);
            }
          });

          return networkResponse;
        })
        .catch((error) => {
          console.log("[Service Worker] Fetch failed:", error);

          // Check if this is a navigation request
          if (event.request.mode === "navigate") {
            // Return the offline page
            return caches.match(BASE_PATH + "/offline.html");
          }

          // For other requests, return an error response
          return new Response("Network error", {status: 408});
        });
    })
  );
});

// Handle messages from clients
self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }
});
