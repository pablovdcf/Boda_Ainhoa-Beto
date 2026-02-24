const SW_VERSION = "2026-02-24-v2";
const ASSET_CACHE = `boda-assets-${SW_VERSION}`;
const OFFLINE_URL = "/offline.html";

const ASSET_PREFIXES = ["/assets/", "/icons/", "/_astro/"];
const ASSET_EXTENSIONS = [
  ".css",
  ".js",
  ".mjs",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
  ".avif",
  ".svg",
  ".ico",
  ".woff2",
  ".json"
];

const PRECACHE_URLS = [OFFLINE_URL, "/manifest.json", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    (async () => {
      const cache = await caches.open(ASSET_CACHE);
      await cache.addAll(PRECACHE_URLS);
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => key !== ASSET_CACHE)
          .map((key) => {
            return caches.delete(key);
          })
      );

      if ("navigationPreload" in self.registration) {
        await self.registration.navigationPreload.enable();
      }

      await self.clients.claim();
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigate(event));
    return;
  }

  if (isStaticAssetRequest(url.pathname)) {
    event.respondWith(cacheFirstAsset(request));
  }
});

async function networkFirstNavigate(event) {
  try {
    const preload = await event.preloadResponse;
    if (preload) return preload;

    return await fetch(event.request);
  } catch {
    const cachedOffline = await caches.match(OFFLINE_URL);
    return (
      cachedOffline ||
      new Response("Offline", {
        status: 503,
        statusText: "Offline"
      })
    );
  }
}

async function cacheFirstAsset(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response && response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

function isStaticAssetRequest(pathname) {
  if (ASSET_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return true;
  }
  return ASSET_EXTENSIONS.some((ext) => pathname.endsWith(ext));
}
