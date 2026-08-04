import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Wrap route navigations in the browser View Transitions API so pages can
    // slide in/out like a native app. The visuals live in globals.css.
    viewTransition: true,
  },
  async headers() {
    return [
      {
        // Never let a service worker itself be cached. A stale sw.js is sticky —
        // browsers would keep running the old copy and there'd be no way to push
        // a fix to clients that already have it.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
