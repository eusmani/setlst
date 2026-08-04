"use client";
import { useEffect } from "react";

// Registers the pass-through service worker in public/sw.js, which is what makes
// SETLST installable as a PWA ("Install app" / "Add to Home Screen").
//
// History: this component used to UNREGISTER workers and wipe all caches,
// because a previous caching worker kept serving stale shells and stale data.
// The replacement worker caches nothing at all, and clears leftover caches on
// activate — so installability is back without the staleness.
//
// Skipped inside the Capacitor shell: the native apps have their own splash and
// lifecycle, and a worker there would only add a second, redundant layer.
export default function RegisterSW() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    (async () => {
      try {
        const { Capacitor } = await import("@capacitor/core");
        if (Capacitor.isNativePlatform()) return;
      } catch {
        // Capacitor absent — plain web, carry on.
      }

      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        // Registration is best-effort; the site works fine without it.
      }
    })();
  }, []);

  return null;
}
