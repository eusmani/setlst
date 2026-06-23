# SETLST — iOS (Capacitor)

This wraps the SETLST web app in a native iOS shell so it can be built in Xcode
and submitted to the App Store. The shell loads the live deployment
(`https://reruns.vercel.app`, set in `../capacitor.config.ts`), so all
server-rendered pages, API routes, and the database work exactly like the website.

## One-time setup
1. Install **Xcode** from the Mac App Store (the full app, not just Command Line
   Tools), then open it once to finish installation and accept the license.
2. From the project root, open the iOS project:
   ```
   npm run ios:open
   ```
   (equivalent to `npx cap open ios`)

## Build & run
- In Xcode, pick a simulator or your connected iPhone, then press **Run** (▶).
- For a device build / App Store submission you'll need an Apple Developer
  account; set your Team under **Signing & Capabilities** for the `App` target.

## After changing native config
If you edit `capacitor.config.ts`, native plugins, or `mobile-shell/`, re-sync:
```
npm run ios:sync
```

## Notes
- Capacitor 8 uses **Swift Package Manager** (no CocoaPods / `pod install`).
- The web UI lives in the main Next.js project and is developed/deployed the same
  way as before (`npm run dev`, `npm run build`, `vercel --prod`). The iOS shell
  just points at the deployed URL — you do **not** rebuild iOS for web changes.
- To test against a local dev server, set `server.url` in `capacitor.config.ts`
  to `http://<your-computer-LAN-ip>:3000` and add `cleartext: true`, then
  `npm run ios:sync`.
