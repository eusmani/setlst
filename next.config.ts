import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Wrap route navigations in the browser View Transitions API so pages can
    // slide in/out like a native app. The visuals live in globals.css.
    viewTransition: true,
  },
};

export default nextConfig;
