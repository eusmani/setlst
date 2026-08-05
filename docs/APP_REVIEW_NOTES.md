# App Review notes — SETLST resubmission

Paste the **Review Notes** section below into App Store Connect → your build →
*App Review Information → Notes*, and work the checklist before submitting.

---

## Review Notes (paste this)

Thank you for the detailed feedback. We've addressed each item:

**1.2 Safety — User Generated Content.** SETLST now implements the full precondition set:

- **EULA acceptance.** Account creation requires explicitly agreeing to our Terms of Use, which state a zero-tolerance policy for objectionable content and abusive behaviour. We record which version each user accepted. Terms: https://setlst.dev/terms
- **Filtering.** All user text (reviews, discussion posts, replies, comments, direct messages, bios, usernames) is screened server-side before it is stored. Content matching prohibited categories — hate speech, sexual content, content sexualizing minors, threats and self-harm — is rejected at submission with an explanation, and never published. The filter normalizes leetspeak and spacing so evasion attempts are caught. Attached photos are additionally screened for explicit imagery on-device.
- **Reporting.** Every piece of user content — reviews, discussions, replies, direct messages, and profiles — has a `···` menu with **Report**, offering nine reasons including copyright infringement. Reports open a moderation queue entry with a snapshot of the content, so it survives the author deleting it.
- **Blocking.** The same `···` menu offers **Block**. Blocking is enforced server-side: blocked users cannot message, follow, or reply to you, you become mutually invisible in feeds, search, profiles and follower lists, and existing follows are severed. Blocked accounts are managed in Settings → Blocked accounts.
- **Acting within 24 hours.** Reports land in an internal moderation queue worked oldest-first, where a moderator can remove content, or remove it and suspend its author (which also hides everything else they posted). Our Terms publicly commit to removing offending content and ejecting the users who post it within 24 hours.

**4.2 Minimum Functionality.** SETLST is a full social music-journaling service, not a repackaged website. Members log and rate albums, write reviews, keep a diary and "crates" (collections), start threaded discussions, direct-message each other, follow friends, and find concerts near them. The iOS app uses native capabilities throughout: push notifications for social activity, Core Location for the concert finder, haptic feedback, the native share sheet (including Instagram Stories sharing of review cards), the native splash screen and status bar, and StoreKit via In-App Purchase for SETLST Pro. This build also adds a native offline experience: the app shows a branded reconnect screen rather than a browser error when it can't reach the network, and recovers automatically when connectivity returns.

**5.1.1 Privacy — Data Collection and Storage.** Our privacy policy (https://setlst.dev/privacy) has been rewritten to disclose every category of data we collect, the purpose of each, and every third-party processor by name. Additional changes in this build:

- A phone number is now **optional** at sign-up — SETLST is fully usable without one. It is used only for account recovery and friend-matching, and can be removed at any time.
- **Account deletion is available in-app** at Settings → Delete account. It permanently removes the profile, reviews, ratings, comments, discussions, crates, messages, follows, phone number and any connected Spotify tokens, immediately.
- We removed the Contacts capability from the iOS build entirely. The app no longer links the contacts framework and no longer declares `NSContactsUsageDescription`, because it does not access the address book on iOS.
- Location is only requested from an explicit user action ("find concerts near me"), never on launch or in the background, and the purpose string states exactly what it's used for.

**5.1.2 Privacy — Data Use and Sharing.** Data is used only for the purposes disclosed. We do not sell data, share it with data brokers, or use third-party advertising or cross-app tracking SDKs. Where SETLST offers contact-based friend finding on platforms that support it, numbers are hashed with SHA-256 **on the device** and only digests are transmitted; matching happens in memory and nothing is retained — not the digests, and nothing at all about contacts who aren't members. The privacy policy enumerates every processor (Vercel, Turso, Resend, Twilio, Apple, RevenueCat, Spotify, SeatGeek, OpenStreetMap, MusicBrainz, Wikipedia) and what each receives.

**5.2.1 Intellectual Property.** SETLST does not host, stream, or sell music. It displays catalogue **metadata** — titles, artists, release dates, track listings and cover art — retrieved at request time from the Apple Music / iTunes Search API, the Spotify Web API, MusicBrainz and Wikipedia, each used under that provider's public developer terms. Artwork is shown at catalogue scale solely to identify the release being discussed, with links back to the rights holder's service. We've added a Copyright & Attribution page (https://setlst.dev/copyright) naming every source and its licence, an in-app attribution notice on every album page, and a takedown process with a dedicated address (copyright@setlst.dev) committing to removal within 24 hours and termination of repeat infringers. Trademarks are attributed to their owners, and we state plainly that SETLST is independent and not affiliated with or endorsed by Apple, Spotify or any artist or label.

**Demo account:** `<username>` / `<password>` — has existing reviews, a discussion thread, and a conversation so reporting and blocking can be exercised immediately.

---

## Pre-submission checklist

### Database
The new tables and columns must exist in **production** (Turso), not just `dev.db`:

```bash
DATABASE_URL="libsql://…" TURSO_AUTH_TOKEN="…" npx prisma db push
```

This adds `Block` and `Report`, the `removedAt` moderation columns, and
`User.phoneHash / suspendedAt / suspendedReason / isModerator / termsAcceptedAt / termsVersion`.

### Backfill phone hashes
Contact matching compares `phoneHash`, so existing members with a saved phone
number need theirs computed once, or they won't be findable by their contacts:

```bash
DATABASE_URL="…" TURSO_AUTH_TOKEN="…" node scripts/backfill-phone-hashes.mjs
```

### Grant yourself moderator access
There is no in-app UI for this by design:

```bash
DATABASE_URL="…" TURSO_AUTH_TOKEN="…" node scripts/set-moderator.mjs <your-username>
```

Then confirm https://setlst.dev/studio/moderation loads for you and 403s for
everyone else.

### Deploy the web app first
The native shell loads `https://setlst.dev`, so **deploy before building the
IPA** — otherwise the reviewer sees the old build's behaviour regardless of what
Xcode uploads.

### Rebuild the iOS app
The Contacts plugin removal changes the linked binary, so a rebuild is required:

```bash
npx cap sync ios
npm run ios:open   # then Product → Archive
```

Verify in the archived build that `NSContactsUsageDescription` is absent from
Info.plist and `CapacitorCommunityContacts` is absent from
`ios/App/CapApp-SPM/Package.swift`.

### App Store Connect metadata
- **Privacy Policy URL**: `https://setlst.dev/privacy`
- **EULA**: leave as Apple's standard EULA, or link `https://setlst.dev/terms`
- **App Privacy questionnaire** — make sure it matches the policy. Declare:
  contact info (email, optional phone), user content (reviews, posts, messages,
  photos), identifiers (user ID), usage/diagnostics as applicable, and **coarse
  or precise location as "not linked to the user"**. Do **not** declare Contacts
  for iOS. Do **not** declare any data used for tracking or third-party
  advertising.
- **Age rating**: the questionnaire should reflect infrequent/mild profanity or
  crude humour in user-generated content, and the app must not be rated 4+.
- **Demo account**: fill in the credentials referenced in the notes above.

### Sanity-check the flows a reviewer will try
- Sign up → the Terms checkbox is required, phone is marked optional and can be skipped.
- Open any review → `···` → Report → pick a reason → submit → confirmation appears.
- `···` → Block → the person disappears from feed, search and profile; DMs to them are refused.
- Settings → Blocked accounts shows them; unblocking restores visibility.
- Settings → Delete account → type DELETE → the account and its content are gone.
- Post a review containing a slur → it is refused with an explanation, and nothing is stored.
- Airplane mode → cold-launch the app → the branded reconnect screen appears, not a browser error.
