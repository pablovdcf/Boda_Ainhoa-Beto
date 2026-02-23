const CACHE_VERSION = "boda-static-v2026-02-23-1";
const STATIC_CACHE = CACHE_VERSION;
const STATIC_ASSET_EXTENSIONS = [
  ".css",
  ".js",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".svg",
  ".ico",
  ".woff2",
  ".json"
];
const PRECACHE_URLS = [
  "/offline.html",
  "/manifest.json",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/assets/themes/classic.css"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      return cache.addAll(PRECACHE_URLS);
    })
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== STATIC_CACHE)
          .map((key) => {
            return caches.delete(key);
          })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstDocument(request));
    return;
  }

  if (isStaticAsset(url.pathname)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirstDocument(request) {
  try {
    return await fetch(request);
  } catch {
    const fallback = await caches.match("/offline.html");
    return (
      fallback ||
      new Response("Offline", {
        status: 503,
        statusText: "Offline"
      })
    );
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE);
  const cached = await cache.match(request);
  const networkPromise = fetch(request)
    .then((response) => {
      if (response && response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => undefined);

  if (cached) return cached;
  const network = await networkPromise;
  if (network) return network;
  return new Response("Not found", { status: 404 });
}

function isStaticAsset(pathname) {
  return STATIC_ASSET_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}

