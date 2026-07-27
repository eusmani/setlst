# Share a review to Instagram Stories

The share button on every review opens a sheet whose first action is **Share to
Instagram Story** — the same handoff Letterboxd and Spotify use. Instagram's
composer opens with the review card already placed; the user publishes it.

Nothing is posted on anyone's behalf, SETLST never sees an Instagram login, and
no Instagram Graph API token is involved. Meta's story-sharing integration for
iOS is a pasteboard + URL-scheme handoff, not a server API.

## How it fits together

| Piece | File | Job |
| --- | --- | --- |
| Card art | `src/app/api/review/story/route.tsx` | Renders the review as a PNG. `?v=story` → 1080×1920 full-bleed, `?v=sticker` → 900×1500 transparent. |
| Payload shape | `src/lib/story.ts` | The fields a card needs, the URL builder, and the grade-tinted gradient. |
| Native handoff | `ios/App/App/InstagramStoryPlugin.swift` | Writes `com.instagram.sharedSticker.*` pasteboard items, then opens `instagram-stories://share`. Also exposes a `UIActivityViewController` fallback. |
| Registration | `ios/App/App/AppDelegate.swift` | `MainViewController.capacitorDidLoad()` hands the plugin to the bridge — app-target plugins aren't in the generated `capacitor.config.json`. |
| Web bridge | `src/lib/instagramStory.ts` | Calls the plugin on device; falls back to the Web Share API, then to opening the PNG. |
| UI | `src/components/review/ShareSheet.tsx` | The bottom sheet: preview, Instagram, save/share, copy link. |

On device the sticker is dropped over a gradient tinted by the review's grade
(gold for S, red for F), so the story matches the app's colour language and the
user can still drag and resize the card inside Instagram.

## One-time setup: the Meta app ID

Instagram accepts the handoff without an app ID, but then the story carries no
attribution back to SETLST. To attribute it:

1. Go to <https://developers.facebook.com/apps> and create an app (type
   **Consumer**; no products or review needed for story sharing).
2. Copy the numeric **App ID** from the app dashboard.
3. Set it as `NEXT_PUBLIC_INSTAGRAM_APP_ID` — locally in `.env`, and on Vercel
   for Production/Preview/Development.
4. Redeploy. It's a `NEXT_PUBLIC_` variable, so it is inlined at build time and
   a redeploy is required for it to take effect.

The iOS side needs nothing further: `LSApplicationQueriesSchemes` in
`ios/App/App/Info.plist` already allows querying and opening
`instagram-stories`.

## Testing

The story composer only exists on a real device with Instagram installed — the
simulator has neither, so it takes the share-sheet fallback there.

```bash
npx cap sync ios
npm run ios:open      # run on a device, open any review, tap Share
```

To check the card art alone, hit the route directly:

```
/api/review/story?v=sticker&title=Blonde&artist=Frank%20Ocean&rating=10&username=you
```

Only artwork hosted by Spotify or Apple Music is drawn — the route is public, so
an arbitrary `artwork` URL would turn it into a fetch proxy. Add new CDN
hostnames to `ART_HOSTS` in the route if the catalog gains another source.
