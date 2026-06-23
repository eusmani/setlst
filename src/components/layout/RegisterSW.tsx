"use client";
import { useEffect } from "react";

export default function RegisterSW() {
  useEffect(() => {
    // Service worker caching repeatedly caused stale shells/data. Tear it down:
    // unregister any existing worker and clear all caches. No new registration.
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
    }
    if (typeof caches !== "undefined") {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
  }, []);
  return null;
}
