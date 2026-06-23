# SETLST — Project Notes

A Letterboxd/RateYourMusic-style music app: log albums, grade them, write reviews,
follow friends, discover new releases. In-app brand is **SETLST**; the repo/folder
is `reruns` and it deploys to **https://reruns.vercel.app**.

## Stack
- **Next.js 16** (App Router, React 19) — `src/app/`
- **TypeScript** + **Tailwind CSS 4**
- **Prisma 7** + `@prisma/adapter-libsql` → **Turso** (libSQL/SQLite) cloud DB
- **NextAuth v5** (Credentials, JWT), bcryptjs hashing
- **Resend** for transactional email
- **Capacitor 8** wrapping the web app into a native **iOS** shell (`ios/`)
- Hosting: **Vercel**

## Running locally
```
npm install
npm run dev            # http://localhost:3000
```
Needs `.env.local` with: `DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NEXTAUTH_SECRET`,
`RESEND_API_KEY`, `EMAIL_FROM`. (Optional: `DICE_API_KEY` — see Concerts note.)

## Deploy
```
npm run build
vercel --prod          # verify with: vercel ls reruns --prod
```

## Data sources (important context)
- **Spotify API is NOT usable** here (server-blocked / empty results). Everything
  uses **iTunes Search API** (album/cover/track data), **Apple RSS** charts,
  **MusicBrainz** (genres/credits), **Wikipedia** (descriptions). Album IDs are
  iTunes `collectionId`s (still called `spotifyId` in code/DB for historical reasons).
- Covers self-heal via iTunes in `AlbumCard`; overrides in `src/lib/coverOverrides.ts`.

## Rating system (F → S)
- Lives in **`src/lib/rating.ts`** (plain module — NOT `"use client"`, so it can be
  used in both Server and Client Components; calling a client-module function during
  SSR throws, which previously 500'd the profile page).
- Grades worst→best: **F, D, C, B, A, S** with words (Garbage … Masterpiece), stored
  as a number 1–10 so averages/trending keep working. `ratingTier(v)`, `ratingColor`,
  `ratingLabel`, `GRADES`, `COLORS`.
- UI: `src/components/ui/RatingMeter.tsx` (`RatingMeter` filled-bar display +
  `RatingInput` slider). Album page also has a distribution bar chart:
  `src/app/album/[spotifyId]/RatingBars.tsx`.

## Theme system (`src/app/globals.css`)
- Two themes via an `html` class, chosen by the `setlst-theme` cookie (default
  `amber` = dark). `theme-amber` = **dark: black + gold (#c4a832)**.
  `theme-mono` = **light: eggshell (#f3ecdb) + dark ink (#1c160c)**.
- Components are authored in the **dark palette using literal arbitrary classes**
  (`bg-[#111111]`, `text-[#f0f0f0]`, `#c4a832`, …). The light theme works by
  **overriding those exact class names** in `globals.css` (`html.theme-mono .bg-\[\#111111\]{…}`).
  ⇒ To stay themeable, reuse those token classes; don't introduce off-palette hex
  or inline color styles (they won't flip in light mode).
- Toggle in Settings (sun = light, moon = dark logos).

## Key features & where they live
- **Album page** `src/app/album/[spotifyId]/`: `page.tsx` (header, mosaic backdrop,
  genre pills + Discogs-noise note, play button), `LogPanel.tsx` (your rating),
  `AlbumClient.tsx` (tracklist + reviews), `ReviewForm.tsx`, `Tracklist.tsx`
  (YouTube links), `AlbumBackdrop.tsx` (blurred art bg that fades on scroll),
  `AlbumPlayButton.tsx` (hover on desktop, hidden on touch), `RatingBars.tsx`.
- **Reviews**: `src/components/review/ReviewCard.tsx` (grade word + subject, circled
  grade letter, song picks link to YouTube).
- **Home** `src/app/page.tsx` + `HomeFeed.tsx` (Feed/Recommended tabs), `TrendingAlbums`
  (Popular This Week slider, slide-in animation), `AnniversaryBanner` (on-this-day,
  data in `src/lib/anniversaries.ts`), `ReleaseRadar`, `LocalConcerts`,
  `UpcomingBanner` (top "New Release" bar; hidden on /search + /album).
- **Release Radar** `src/app/api/releases/route.ts`: iTunes over a rolling 12 months,
  large UNDERGROUND + MAINSTREAM artist lists, ordered by recency.
- **Search** `src/app/search/page.tsx` + `src/app/api/spotify/search/route.ts`:
  popular artists surfaced first via `src/lib/popularArtists.ts`.
- **Profiles** `src/app/profile/[username]/`: top albums, reviews, activity, combined
  "following" list (people + artists), `[list]/page.tsx` sub-pages.
- **Private accounts / follow requests**: `User.isPrivate` + `FollowRequest` model;
  `src/app/api/follow/route.ts` (creates a request for private targets),
  `src/app/api/follow-requests/route.ts` (accept/reject), `FollowButton.tsx`,
  `FollowRequests.tsx`, gating in profile + `[list]` pages, toggle in Settings
  (`src/app/api/user/privacy/route.ts`).
- **Auth/email**: `src/lib/auth.ts` (login with email OR username), `register`,
  email verification (`src/lib/verification.ts`, `email.ts`), VerifyBanner.
- **Mobile**: navbar uses a **right-side sliding drawer** (rendered OUTSIDE `<nav>`
  because the nav's `backdrop-blur` would otherwise trap `position:fixed` children).
  First-launch **onboarding slideshow** (`src/components/layout/Onboarding.tsx`,
  mobile-only, `localStorage` flag `setlst-onboarded`, themeable).

## DB migrations
No `prisma migrate` against Turso here — migrations are applied with small Node
scripts using `@libsql/client` that read `.env.local`. Example: `scripts/migrate-private.mjs`.
After schema edits: update `prisma/schema.prisma`, run `npx prisma generate`, then a
libSQL script to ALTER/CREATE on Turso.

## iOS / Capacitor (`ios/`)
- `capacitor.config.ts`: appId `app.setlst.mobile`, name `SETLST`, `server.url`
  points to the live deployment (the app is SSR + API + DB, so the shell loads the
  deployed site rather than a static export). `webDir: mobile-shell` is just a
  placeholder.
- Open in Xcode: `npm run ios:open` (needs full Xcode). Re-sync native after config/
  plugin changes: `npm run ios:sync`. Capacitor 8 uses **Swift Package Manager**
  (no CocoaPods). See `ios/README.md`.
- **Native plugins**: Geolocation, Contacts (`@capacitor-community/contacts`), Push
  Notifications, Status Bar, Splash Screen, App, Haptics.
- Native code is centralized in **`src/lib/native.ts`** (`getCoords`, `readContactPhones`,
  `tapHaptic`, `isNative`) with web fallbacks, plus `src/components/layout/NativeBridge.tsx`
  (status bar / splash / push registration → `src/app/api/push/register/route.ts`).
- iOS permission strings + `remote-notification` background mode are in
  `ios/App/App/Info.plist`.
- **Push delivery is NOT finished**: device-token registration works, but actually
  sending notifications still needs an APNs auth key, the Push capability enabled in
  Xcode, a token-storage table, and a sender. `/api/push/register` currently just
  acknowledges the token (has a TODO).

## Known limitations / honest notes
- **DICE API**: there is no REST v2 events API — DICE's partner API is GraphQL-only
  ("Ticket Holders API", Bearer auth) and only returns a partner's *own* events, so it
  can't power generic "concerts near me." `LocalConcerts` is dormant unless a suitable
  events source/key is configured.
- **Email** (Resend) is in sandbox until a domain is verified — only delivers to the
  account owner's address.
- **Web Contact Picker** only exists on Chrome/Android; iOS Safari falls back to a
  share-invite (native Contacts plugin covers the iOS app).
- Service worker is a kill-switch (no caching) — see `public/sw.js` + `RegisterSW`.

## Useful npm scripts
```
npm run dev        # local dev server
npm run build      # production build
npm run lint       # eslint
npm run ios:open   # open the iOS project in Xcode
npm run ios:sync   # copy web/config + plugins into the iOS project
```
