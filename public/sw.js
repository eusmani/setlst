// Kill-switch service worker.
// The previous caching worker caused stale shells/chunks after deploys (blank/broken
// UI) and stale session/data. This worker caches nothing, clears all old caches,
// unregisters itself, and reloads open clients onto fresh network responses.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: "window" });
        for (const client of clients) client.navigate(client.url);
      } catch {
        /* no-op */
      }
    })()
  );
});

// No fetch handler — never intercept or cache requests.
