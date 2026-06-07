const CACHE_NAME = "freebox-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/favicon.ico",
  "/manifest.json"
];

// Install Event
self.addEventListener("install", (event) => {
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
    })
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

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        // Fallback offline response for HTML requests
        const acceptHeader = event.request.headers.get("accept");
        if (acceptHeader && acceptHeader.includes("text/html")) {
          return caches.match("/");
        }
      });
    })
  );
});
