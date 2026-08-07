// Offline support for SETLST.
//
// WHY THIS IS SAFE, given the history:
// An earlier worker cached aggressively and kept serving stale shells and stale
// data, so it was replaced with a pass-through that cached nothing. That fixed
// staleness by giving up offline entirely.
//
// This worker is NETWORK-FIRST for everything that can change: every navigation
// and every API read goes to the network first, and the cache is only consulted
// when the network actually fails. While you're online you always get live data
// — the stale-content failure mode is structurally impossible here, because the
// cache is never preferred over a reachable network.
//
// Only immutable assets (/_next/static/*, whose URLs contain a content hash) are
// served cache-first, because a given URL there can never change meaning.

const VERSION = "setlst-v2";
const PAGES = `${VERSION}-pages`;
const DATA = `${VERSION}-data`;
const ASSETS = `${VERSION}-assets`;
const KEEP = new Set([PAGES, DATA, ASSETS]);

// Screens worth having available offline. Fetched lazily as you visit them;
// this list just makes the intent explicit.
const OFFLINE_ROUTES = ["/", "/activity", "/diary", "/search", "/settings"];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Drop caches from older versions of this worker.
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => !KEEP.has(k)).map((k) => caches.delete(k)));
      await self.clients.claim();
    })()
  );
});

/** Network-first: live data when online, cached copy only when the network fails. */
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const response = await fetch(request);
    // Only cache real successes — an error page cached as a route is worse than
    // no cache at all.
    if (response && response.ok && response.type === "basic") {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    throw error;
  }
}

/** Cache-first, for URLs whose content can never change (hashed asset names). */
async function cacheFirst(request) {
  const cache = await caches.open(ASSETS);
  const cached = await cache.match(request);
  if (cached) return cached;
  const response = await fetch(request);
  if (response && response.ok) cache.put(request, response.clone());
  return response;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return; // never cache writes

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // third-party artwork etc.

  // Auth must never be served from cache — a cached session response would show
  // the wrong person's state.
  if (url.pathname.startsWith("/api/auth")) return;

  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      networkFirst(request, PAGES).catch(async () => {
        // Offline and this exact page was never visited — fall back to the home
        // shell if we have it, so the app opens to something rather than a
        // browser error.
        const cache = await caches.open(PAGES);
        return (await cache.match("/")) ?? Response.error();
      })
    );
    return;
  }

  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request, DATA));
  }
});

// Warm the cache for the main screens once the app is running and idle, so the
// first offline launch has something to show.
self.addEventListener("message", (event) => {
  if (event.data !== "setlst:warm-offline-cache") return;
  event.waitUntil(
    (async () => {
      const cache = await caches.open(PAGES);
      await Promise.all(
        OFFLINE_ROUTES.map(async (route) => {
          try {
            const response = await fetch(route, { credentials: "same-origin" });
            if (response.ok) await cache.put(route, response);
          } catch {
            /* offline already — nothing to warm */
          }
        })
      );
    })()
  );
});
