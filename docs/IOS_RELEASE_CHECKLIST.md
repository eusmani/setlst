# SETLST — iOS / App Store Release Checklist

Tailored to this project. The app is a **Capacitor (SPM) native shell** that loads the
live Vercel deployment (`https://reruns.vercel.app`); the backend (API routes + Prisma on
Turso) runs on Vercel — iOS does **not** host the server.

- **App name:** SETLST · **Bundle ID:** `app.setlst.mobile`
- **Xcode project:** `ios/App/App.xcodeproj` (no `.xcworkspace` — uses Swift Package Manager)
- **Config:** `capacitor.config.ts`

---

## 0. One-time blocker: install the iOS platform
The iOS **SDK stub** is present but Xcode 26 downloads the full **platform support
package** separately. Until it's installed, `xcodebuild`/archiving fails with
*"iOS 26.5 is not installed."*

```bash
xcodebuild -downloadPlatform iOS      # ~7 GB; or Xcode ▸ Settings ▸ Components ▸ iOS
```

Then verify a build compiles:
```bash
npx cap sync ios
xcodebuild -project ios/App/App.xcodeproj -scheme App \
  -destination 'generic/platform=iOS' build CODE_SIGNING_ALLOWED=NO
```

## 1. Prerequisites
- [ ] **Apple Developer Program** membership ($99/yr) — required to upload.
- [ ] Xcode 26.5 (installed ✓) + iOS platform (step 0).
- [ ] A **privacy policy URL** (required — app collects accounts, location, contacts).

## 2. Open the project
```bash
npx cap sync ios        # copy web + sync plugins (run after any web/plugin change)
npx cap open ios        # opens App.xcodeproj in Xcode
```

## 3. Signing (App target ▸ Signing & Capabilities)
- [ ] **Automatically manage signing** = ON.
- [ ] Select your **Team**. Bundle ID is already `app.setlst.mobile`.
- [ ] Confirm the **Push Notifications** capability shows (entitlement is already wired —
      see `ios/App/App/App.entitlements` and `CODE_SIGN_ENTITLEMENTS` in the pbxproj).

## 4. Icon, splash, version
- [x] App icon (1024×1024) and light/dark splash generated from `public/turntable-logo.png`
      on a dark background — in `Assets.xcassets/AppIcon.appiconset` + `Splash.imageset`.
- [ ] Set **Version** (`MARKETING_VERSION`, currently `1.0`) and **Build**
      (`CURRENT_PROJECT_VERSION`, currently `1`). Bump Build on every upload.

## 5. Push notifications (APNs) — only if shipping push at launch
- [ ] In App Store Connect ▸ Certificates, IDs & Profiles, create an **APNs Auth Key (.p8)**;
      add the key + Key ID + Team ID to the server's push config (Vercel env).
- [ ] **Important:** `App.entitlements` is set to `aps-environment = development`. For
      **TestFlight/App Store** builds, change it to **`production`** (or maintain separate
      Debug/Release entitlements). Sandbox env will not deliver production pushes.
- [ ] Push is optional for v1 — the app registers for it but core features work without it.

## 6. Backend / runtime sanity
- [ ] `capacitor.config.ts` `server.url` = `https://reruns.vercel.app` (production). ✓
- [ ] Production env on Vercel has the keys the app needs: `SEATGEEK_CLIENT_ID/SECRET`,
      `SPOTIFY_CLIENT_ID/SECRET`, `DATABASE_URL` + `TURSO_AUTH_TOKEN`, `AUTH_SECRET`.

## 7. Archive & upload
1. In Xcode, set the run destination to **Any iOS Device (arm64)**.
2. **Product ▸ Archive**.
3. In the Organizer: **Distribute App ▸ App Store Connect ▸ Upload**.
4. Wait for processing, then it appears in **TestFlight**.

## 8. App Store Connect metadata
- [ ] Create the app record (name **SETLST**, bundle ID `app.setlst.mobile`, primary language).
- [ ] **App Privacy** labels — declare what's collected: account info (email), **precise
      location** (Local Concerts), **contacts** (find friends), usage/content.
- [ ] Screenshots (6.7" + 6.5" iPhone at minimum), description, keywords, support URL,
      **privacy policy URL**.
- [ ] **Account deletion**: required because users can sign up. Already implemented in-app at
      `/settings/delete` → point Apple's "Account Deletion" question at it.
- [ ] Age rating questionnaire; export-compliance (standard HTTPS → usually "No"/exempt).

## 9. Submit for review — known risk ⚠️
- **Guideline 4.2 (minimum functionality):** apps that are essentially a website in a
  WebView can be rejected. Mitigation here is solid — the app uses **native location, push,
  contacts, and haptics**, and has **in-app account deletion**. In the review notes, call out
  the native features and provide a **demo account** (login at `/login`) so reviewers can see
  the full experience.

## Command reference
```bash
npx cap sync ios                 # after any web build or plugin change
npx cap open ios                 # open in Xcode
npx @capacitor/assets generate --ios \
  --iconBackgroundColor '#111111' --splashBackgroundColor '#111111'   # regenerate art
```

## What's already done in this repo
- ✓ Capacitor iOS project synced (7 plugins: geolocation, push, contacts, haptics, app,
  splash, status-bar — package graph resolves).
- ✓ Info.plist usage strings: location + contacts; `UIBackgroundModes: remote-notification`.
- ✓ Push entitlement (`App.entitlements`, `aps-environment`) created and wired into Debug +
  Release build configs.
- ✓ 1024 app icon + light/dark splash generated from the logo.
- ⏳ Remaining before a build/archive: install the iOS platform (step 0) + set your Team (step 3).
