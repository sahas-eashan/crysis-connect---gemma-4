const CACHE_NAME = "crisisconnect-v2";
const TILE_CACHE_NAME = "crisisconnect-offline-tiles-v1";
const CORE_ASSETS = ["/manifest.json"];

function isHttpRequest(request) {
  return request.url.startsWith("http");
}

function isSameOrigin(request) {
  return new URL(request.url).origin === self.location.origin;
}

function shouldBypassCache(request) {
  if (!isHttpRequest(request) || request.method !== "GET" || !isSameOrigin(request)) {
    return true;
  }

  const { pathname, search } = new URL(request.url);
  return (
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/api/") ||
    pathname === "/sw.js" ||
    search.length > 0
  );
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(CORE_ASSETS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME && key !== TILE_CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method === "GET" && event.request.url.startsWith("http") && !isSameOrigin(event.request)) {
    event.respondWith(
      caches.match(event.request).then((cached) => cached || fetch(event.request))
    );
    return;
  }

  if (shouldBypassCache(event.request)) {
    event.respondWith(fetch(event.request));
    return;
  }

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match("/") || Response.error())
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request)
        .then((response) => {
          if (event.request.method === "GET" && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
          }
          return response;
        })
        .catch(() => caches.match("/"));
    })
    );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_EMERGENCY_TILES" || !Array.isArray(event.data.urls)) {
    return;
  }

  const urls = event.data.urls.filter((url) => typeof url === "string" && url.startsWith("http"));
  event.waitUntil(
    caches.open(TILE_CACHE_NAME).then(async (cache) => {
      for (const url of urls) {
        try {
          const cached = await cache.match(url);
          if (cached) continue;
          const response = await fetch(url, { mode: "cors" });
          if (response.ok) {
            await cache.put(url, response.clone());
          }
        } catch {
          // Tile caching is opportunistic; failed tiles can be retried on the next sync.
        }
      }
    })
  );
});
