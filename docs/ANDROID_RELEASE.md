# SETLST — Android / Google Play Release Guide

Companion to `IOS_RELEASE_CHECKLIST.md`. Same architecture: the Android app is a
**Capacitor native shell** that loads the live deployment (`https://setlst.dev`).
The backend (API routes + Prisma on Turso) runs on Vercel — Android does **not**
host the server.

- **App name:** SETLST · **Android package:** `dev.setlst.app`
- **Gradle project:** `android/` · **Config:** `capacitor.config.ts`
- **Min SDK:** 24 (Android 7.0) · **Target/Compile SDK:** 36

> The package name is **permanent**. Google Play will never let it change once
> the first bundle is uploaded.

### Why Android's package differs from the iOS bundle ID

iOS uses `app.setlst.native`; Android **cannot**. An Android package name must be a
valid Java package, and `native` is a **reserved Java keyword** — it fails to compile
(`Namespace 'app.setlst.native' is not a valid Java package name`) and Play rejects
reserved keywords at upload. Android therefore uses `dev.setlst.app`, the reverse-DNS
form of `setlst.dev`.

The mismatch is intentional and harmless — the two stores have separate namespaces.
It lives in three places, all of which must agree:

| File | Setting |
|---|---|
| `android/app/build.gradle` | `namespace` + `applicationId` |
| `android/app/src/main/java/dev/setlst/app/MainActivity.java` | `package` declaration |
| `android/app/src/main/res/values/strings.xml` | `package_name`, `custom_url_scheme` |

`capacitor.config.ts` keeps `appId: "app.setlst.native"` for iOS; Capacitor 8 has no
per-platform `appId`, so Android's package is set directly in Gradle. **Do not
"fix" the mismatch by re-running `npx cap add android`** — it would regenerate the
illegal package.

---

## 0. Toolchain (already installed on this machine)

No Android Studio required — the command-line SDK is enough to build a release bundle.

```bash
brew install openjdk@21                        # JDK 21 — Capacitor 8 / AGP requires it
brew install --cask android-commandlinetools   # sdkmanager, adb, apkanalyzer
```

Note the `openjdk@21` **formula**, not the `temurin@21` cask — the cask installs
via a `.pkg` that needs an interactive `sudo` password.

Every Gradle invocation needs these three exports:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH=$JAVA_HOME/bin:$PATH
```

Consider appending them to `~/.zshrc`. The SDK path is also written to
`android/local.properties`, which is gitignored — recreate it on a new machine.

SDK packages installed: `platform-tools`, `platforms;android-36`, `build-tools;36.0.0`.

---

## 1. Signing key — read this before anything else

Play uses **Play App Signing**: Google holds the real app signing key, and you hold
an **upload key** that only proves uploads come from you.

| | |
|---|---|
| **Keystore** | `~/.android-keystores/setlst-upload.jks` (outside the repo, mode 600) |
| **Alias** | `setlst-upload` |
| **Password** | in `~/.android-keystores/setlst-upload.password.txt` |
| **Validity** | 10,000 days (RSA 4096) |
| **Wired up via** | `android/keystore.properties` → `android/app/build.gradle` |

`keystore.properties` and `*.jks` are gitignored. **Back the keystore and password
up somewhere off this machine** (password manager / encrypted backup). If you lose
the upload key you can request a reset from Google — recoverable, but slow. Losing
it while *not* enrolled in Play App Signing would be unrecoverable.

If `keystore.properties` is missing, the release build still assembles — just
unsigned — so a fresh clone without the key isn't broken.

---

## 2. Build the release bundle

```bash
npm run android:bundle
```

That runs `cap sync android` then `./gradlew bundleRelease`. Output:

```
android/app/build/outputs/bundle/release/app-release.aab
```

Verify it is signed before uploading:

```bash
$ANDROID_HOME/build-tools/36.0.0/apksigner verify --print-certs \
  --min-sdk-version 24 android/app/build/outputs/bundle/release/app-release.aab
```

To test on a real device first, build an APK instead — Play does not accept APKs,
but they sideload:

```bash
cd android && ./gradlew assembleRelease
adb install app/build/outputs/apk/release/app-release.apk
```

---

## 2b. Emulator (smoke tests + screenshots)

An AVD named `setlst_test` (Android 36, arm64, Google APIs) is already created.

```bash
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
export PATH=$ANDROID_HOME/emulator:$ANDROID_HOME/platform-tools:$PATH

emulator -avd setlst_test -no-window -no-audio -no-snapshot -no-boot-anim \
  -gpu swiftshader_indirect &
adb wait-for-device
until [ "$(adb shell getprop sys.boot_completed | tr -d '\r')" = "1" ]; do sleep 3; done

adb install -r android/app/build/outputs/apk/release/app-release.apk
adb shell am start -n dev.setlst.app/.MainActivity
adb shell screencap -p /sdcard/s.png && adb pull /sdcard/s.png ./shot.png
adb emu kill        # when finished
```

Drop `-no-window` to watch it interactively. Note `adb shell monkey` is unreliable
for launching this app (it exits `-5` without starting it) — use `am start`.

Verified on this build: launches clean, loads `https://setlst.dev`, Capacitor
bridge starts, the Android 13+ notification prompt appears, and no crash occurs
despite the missing Firebase config (`FirebaseInitProvider` just logs and moves on).

## 3. Versioning

In `android/app/build.gradle` → `defaultConfig`:

- `versionCode` — integer, **must strictly increase on every upload**. Play rejects
  a re-used code even if the previous upload was discarded.
- `versionName` — the user-visible string. Keep it in step with the iOS
  `MARKETING_VERSION`.

Currently `versionCode 1` / `versionName "1.0"`.

---

## 4. Play Console — first release

1. **Create the app** — Play Console ▸ All apps ▸ *Create app*. Name `SETLST`,
   type *App*, free or paid (can't change free → paid later).
2. **Set up ▸ App content** — every item must be green before you can roll out:
   - **Privacy policy URL** — required; the app collects accounts, location, contacts.
   - **Data safety** — declare what's collected. For this app that's at minimum:
     account info (email), approximate/precise **location**, and **contacts**.
     State whether each is encrypted in transit and whether users can request deletion.
   - **Sensitive permissions** — `READ_CONTACTS` needs a declaration explaining the
     in-app purpose (finding friends who already use SETLST) plus a demo video link.
     This is the most common cause of a first-review rejection — be specific.
   - **Ads**, **content rating** questionnaire, **target audience**, **news app**,
     **government app**, **financial features**, **health**.
3. **Upload** the `.aab` to a track (see §5) and complete the store listing:
   - Short description (80 chars), full description (4000)
   - **App icon** 512×512 PNG → `assets/play/icon-512.png`
   - **Feature graphic** 1024×500 PNG → `assets/play/feature-graphic-1024x500.png`
   - **Phone screenshots** — 2 to 8, min 320px on the short side. One usable
     logged-out shot is in `assets/play/screenshots/01-home.png`. **You need at
     least one more**, and the good ones require a signed-in account with real
     data — the Albums/Activity tabs are empty placeholders when logged out.
     Capture them with the emulator recipe in §2b.

   Regenerate the first two with `npm run android:store-assets`
   (`scripts/generate-play-store-assets.mjs`). The feature graphic's tagline
   ("Every show. Every setlist.") is a placeholder — edit the SVG text in that
   script if you want different copy.
4. **Roll out.**

---

## 5. Testing track requirements

If your Play developer account is a **personal** account created after Nov 2023,
Google requires a closed test with **at least 12 testers opted in continuously for
14 days** before the Production track unlocks. **Organization** accounts skip this.

Plan the calendar around it — it is not waivable, and the 14 days restart if tester
count drops below 12.

---

## 6. Known gaps on Android

Neither blocks a release; both are things iOS has that Android currently doesn't.

### Push notifications need Firebase
`@capacitor/push-notifications` uses **FCM** on Android, which requires a
`google-services.json`. `android/app/build.gradle` already has the conditional
hook — it logs and skips the plugin when the file is absent. To enable push:

1. Create a Firebase project, add an Android app with package `dev.setlst.app`.
2. Download `google-services.json` → `android/app/google-services.json`.
3. Add the `com.google.gms:google-services` classpath to `android/build.gradle`.
4. Point the server's push sender at FCM (it currently targets APNs only).

Until then the app runs fine; `PushNotifications.register()` just no-ops.

### In-app purchases are iOS-only
`src/lib/purchases.ts` gates on `NEXT_PUBLIC_REVENUECAT_IOS_KEY` and the RevenueCat
plugin — neither is installed, so the SETLST Pro upgrade shows its
"coming soon" message on Android. That is the safe state: **Play policy requires
Google Play Billing for digital goods**, so shipping an external payment link for
Pro would risk removal. To enable later, add
`@revenuecat/purchases-capacitor`, a `NEXT_PUBLIC_REVENUECAT_ANDROID_KEY`, and
create the subscription in the Play Console.

---

## 7. Policy note — WebView apps

Play's *Minimum Functionality* policy rejects apps that are only a wrapper around a
website. SETLST clears this: it uses native geolocation, contacts, haptics, splash,
status bar, and push integrations rather than just rendering a page. Keep it that
way — if native features are ever stripped out, the listing becomes vulnerable.

---

## 8. After any web or plugin change

The shell loads the live site, so **most product changes ship via Vercel and need no
new bundle.** Only rebuild and re-upload when you change native config: plugins,
permissions, icons, splash, `capacitor.config.ts`, or the version.

```bash
npm run android:sync     # after adding/removing a Capacitor plugin
npm run android:bundle   # new .aab (remember to bump versionCode first)
```
