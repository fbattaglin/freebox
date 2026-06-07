const CACHE_NAME = "freebox-v1.1";
const ASSETS_TO_CACHE = [
  "/",
  "/favicon.ico",
  "/manifest.json"
];

// Install Event
self.addEventListener("install", (event) => {
  self.skipWaiting(); // Force active immediately
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("Caching shell assets...");
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("Clearing old cache:", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim()) // Claim clients immediately
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Bypass all local development hosts and internal Next.js assets
  const isLocal =
    url.hostname === "localhost" ||
    url.hostname === "127.0.0.1" ||
    url.hostname.startsWith("192.168.") ||
    url.hostname.startsWith("10.") ||
    url.hostname.startsWith("172.16.") ||
    url.hostname.endsWith(".local");

  if (
    isLocal ||
    url.pathname.includes("/api/") ||
    url.pathname.includes("/_next/") ||
    url.pathname.includes("webpack") ||
    url.pathname.includes("hmr")
  ) {
    return; // Let browser handle it directly
  }

  // Determine if it is a request for the main HTML document
  const isHtml = event.request.headers.get("accept")?.includes("text/html") || url.pathname === "/";

  if (isHtml) {
    // Network-First strategy for the main application pages to guarantee updates
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // Cache the fresh page
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // Fallback to cache if completely offline
          return caches.match(event.request);
        })
    );
  } else {
    // Cache-First strategy for static assets (icons, fonts, etc.)
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
          return response;
        });
      })
    );
  }
});
