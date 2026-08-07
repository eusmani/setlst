"use client";
import { useEffect } from "react";

// Registers the service worker in public/sw.js — installability on the web, and
// offline support everywhere including the native app.
//
// History: this component used to UNREGISTER workers and wipe all caches,
// because an early cache-first worker kept serving stale shells and stale data.
// The current worker is network-first for pages and API reads, so a reachable
// network always wins and the cache is only a fallback — the staleness that
// motivated that purge can't recur.
//
// It now also runs inside the Capacitor shell. That's the whole point of the
// change: without a worker, losing signal in the app meant a dead web view, and
// "it stops working offline" is exactly the kind of thing that reads as a web
// page rather than an app.
export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    (async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js");

        // Once the app is idle, warm the cache for the main screens so the first
        // offline launch has something to render. Deferred so it never competes
        // with the initial page load.
        const warm = () => {
          navigator.serviceWorker.controller?.postMessage("setlst:warm-offline-cache");
        };
        if (registration.active) {
          const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
            .requestIdleCallback;
          if (idle) idle(warm);
          else setTimeout(warm, 4000);
        }
      } catch {
        // Registration is best-effort; the app works fine without it.
      }
    })();
  }, []);

  return null;
}
