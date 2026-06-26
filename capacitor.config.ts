import type { CapacitorConfig } from "@capacitor/cli";

// Native iOS shell for SETLST. Because the app is server-rendered (SSR pages +
// API routes + database), the native shell loads the live deployment rather than
// a static export — so everything works inside the app exactly like the website.
//
// For local development against your dev server instead, temporarily set
// server.url to "http://<your-LAN-ip>:3000" and add "cleartext: true".
const config: CapacitorConfig = {
  appId: "app.setlst.mobile",
  appName: "SETLST",
  webDir: "mobile-shell",
  // Dark native background so the iPhone safe areas (notch / home indicator)
  // match the app instead of showing white borders.
  backgroundColor: "#111111",
  server: {
    url: "https://reruns.vercel.app",
  },
  ios: {
    contentInset: "always",
    backgroundColor: "#111111",
  },
};

export default config;
