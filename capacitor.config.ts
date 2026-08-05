import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS + Android shell for SETLST. Because the app is server-rendered (SSR
// pages + API routes + database), the native shell loads the live deployment
// rather than a static export — so everything works inside the app exactly like
// the website.
//
// For local development against your dev server instead, temporarily set
// server.url to "http://<your-LAN-ip>:3000" and add "cleartext: true".
const config: CapacitorConfig = {
  // iOS bundle ID only. Android CANNOT use this — "native" is a reserved Java
  // keyword, so it's an illegal Android package name. Android is pinned to
  // dev.setlst.app in android/app/build.gradle (Capacitor 8 has no per-platform
  // appId). Don't re-run `npx cap add android`; see docs/ANDROID_RELEASE.md.
  appId: "app.setlst.native",
  appName: "SETLST",
  webDir: "mobile-shell",
  // Dark native background so the iPhone safe areas (notch / home indicator)
  // match the app instead of showing white borders.
  backgroundColor: "#111111",
  server: {
    url: "https://setlst.dev",
    // Shown when the shell can't reach the network on launch. Without it
    // WKWebView renders a blank page or a raw browser error — see
    // mobile-shell/error.html.
    errorPath: "error.html",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#111111",
  },
  android: {
    backgroundColor: "#111111",
    // The shell only ever loads https://setlst.dev, so plain-HTTP traffic is
    // never needed — leaving this false keeps Play's cleartext check happy.
    allowMixedContent: false,
  },
};

export default config;
