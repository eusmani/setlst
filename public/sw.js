// Pass-through service worker.
//
// Its ONLY job is to make SETLST installable as a PWA — browsers require a
// registered worker with a fetch handler before offering "Install app".
//
// It deliberately caches NOTHING. An earlier caching worker repeatedly served
// stale shells and stale data (see RegisterSW.tsx), so the fetch handler below
// never calls event.respondWith() — every request falls through to the network
// exactly as if no worker existed. Please keep it that way: adding caching here
// re-introduces the stale-content bug this file was written to avoid.
//
// The app is server-rendered and always online-first, so there is no offline
// mode to lose.

self.addEventListener("install", () => {
  // Take over immediately instead of waiting for existing tabs to close.
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      // Purge anything the old caching worker left behind, so returning users
      // aren't pinned to a stale shell by a cache we no longer write to.
      const keys = await caches.keys();
      await Promise.all(keys.map((key) => caches.delete(key)));
      await self.clients.claim();
    })(),
  );
});

// Required for installability. Intentionally a no-op: not calling respondWith()
// means the browser performs its normal network fetch.
self.addEventListener("fetch", () => {});
