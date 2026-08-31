/**
 * Demo content for App Review and App Store screenshots.
 *
 * Everything here is invented. That's the point: cover art in the app is
 * licensed for identifying a release (Apple's and Spotify's terms both allow it,
 * Spotify's on condition of a link back), but an App Store screenshot is
 * marketing collateral sitting outside the app, and neither provider can grant
 * rights to artwork the labels own. Guideline 5.2.1 covers "metadata in your app
 * bundle", and screenshots are exactly that — which is what the rejection was
 * about.
 *
 * So the albums, artists, artwork, reviews and discussions below are all ours.
 * Screenshot this account and there is nothing to clear with anyone.
 *
 * It doubles as the App Review demo login, so reporting and blocking can be
 * exercised the moment a reviewer signs in: there are other members to block, a
 * discussion with replies to report, and an existing conversation.
 *
 *   npx tsx scripts/seed-demo.mts            # create/refresh
 *   npx tsx scripts/seed-demo.mts --password 'Chosen-Pass-1'
 *
 * Idempotent — re-running updates in place rather than duplicating.
 */
import { readFileSync } from "node:fs";
import bcrypt from "bcryptjs";

// ---------------------------------------------------------------------------
// Environment
// ---------------------------------------------------------------------------

// DATABASE_URL is in .env, the Turso token in .env.local, and the Apple key is a
// multi-line quoted PEM — so the parser has to handle quoted values spanning
// lines rather than splitting the file by newline.
function loadEnv(file: string) {
  let text: string;
  try {
    text = readFileSync(new URL(file, import.meta.url), "utf8");
  } catch {
    return;
  }
  for (const m of text.matchAll(/^([A-Z0-9_]+)=(?:"([\s\S]*?)"|'([\s\S]*?)'|(.*))$/gm)) {
    process.env[m[1]] ??= m[2] ?? m[3] ?? m[4] ?? "";
  }
}
// Order matters: .env holds a local `file:./dev.db` for development, and the
// production Turso URL lives in .env.production.local. Loading production last
// makes it win — seeding the local file instead of the real database is a silent
// no-op that looks like success right up until you check the live site.
loadEnv("../.env");
loadEnv("../.env.local");
if (!process.argv.includes("--local")) {
  for (const k of ["DATABASE_URL", "TURSO_AUTH_TOKEN"]) delete process.env[k];
  loadEnv("../.env.production.local");
  loadEnv("../.env");        // fall back if production isn't configured
  loadEnv("../.env.local");
}

const { PrismaClient } = await import("../src/generated/prisma/client.js");
const { PrismaLibSql } = await import("@prisma/adapter-libsql");

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is not set — check .env");
console.log(`  target: ${url.startsWith("file:") ? "LOCAL " + url : "production Turso"}\n`);
const prisma = new PrismaClient({
  adapter: new PrismaLibSql({
    url,
    ...(process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.TURSO_AUTH_TOKEN } : {}),
  }),
});

const TERMS_VERSION = "2026-08-04";
const passwordArg = process.argv.indexOf("--password");
const PASSWORD = passwordArg > -1 ? process.argv[passwordArg + 1] : "SetlstDemo!2026";

// ---------------------------------------------------------------------------
// Cover art
// ---------------------------------------------------------------------------

/**
 * A cover as an inline SVG data URL.
 *
 * Drawn rather than downloaded, so it's ours to put in a screenshot. Kept to a
 * few hundred bytes because artwork is stored inline in the database — the same
 * constraint that caps avatars.
 *
 * The palette and geometry are derived from the title, so a given album always
 * looks the same and the grid doesn't come out as six variations of one colour.
 */
function cover(title: string, from: string, to: string, style: "arc" | "bars" | "orb"): string {
  const initials = title
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const shape =
    style === "arc"
      ? `<path d="M0 420 Q300 200 600 420 L600 600 L0 600 Z" fill="#000" opacity=".28"/>
         <circle cx="300" cy="250" r="120" fill="none" stroke="#fff" stroke-opacity=".5" stroke-width="3"/>`
      : style === "bars"
      ? `<g fill="#000" opacity=".22">${[0, 1, 2, 3, 4, 5]
          .map((i) => `<rect x="${60 + i * 84}" y="${140 + (i % 3) * 70}" width="46" height="${300 - (i % 3) * 60}" rx="23"/>`)
          .join("")}</g>`
      : `<circle cx="300" cy="300" r="190" fill="#000" opacity=".22"/>
         <circle cx="300" cy="300" r="120" fill="#fff" opacity=".14"/>
         <circle cx="300" cy="300" r="26" fill="#000" opacity=".35"/>`;

  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="${from}"/><stop offset="1" stop-color="${to}"/>` +
    `</linearGradient></defs>` +
    `<rect width="600" height="600" fill="url(#g)"/>${shape}` +
    `<text x="46" y="548" font-family="Helvetica,Arial,sans-serif" font-size="72" font-weight="700" fill="#fff" fill-opacity=".92">${initials}</text>` +
    `</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

// ---------------------------------------------------------------------------
// The fiction
// ---------------------------------------------------------------------------

// `spotifyId` is the route key for /album/<id>. These are prefixed so they can
// never collide with a real catalogue id, and so anything demo-shaped is obvious
// in the database later. The prefix also fails the 22-character Spotify id test,
// which means the album page skips the Spotify lookup entirely and renders from
// our row.
const ALBUMS = [
  { id: "demo-halcyon-static", title: "Halcyon Static", artist: "Neon Cartography", year: 2025, genres: ["Dream Pop", "Shoegaze"], from: "#c4a832", to: "#6b3f8f", style: "arc" as const },
  { id: "demo-paper-radio", title: "Paper Radio", artist: "The Vantage Hours", year: 2024, genres: ["Indie Rock"], from: "#2f6f7f", to: "#0f2027", style: "bars" as const },
  { id: "demo-low-ceilings", title: "Low Ceilings", artist: "Marguerite Vale", year: 2026, genres: ["Alt-Country", "Folk"], from: "#a8452e", to: "#3d1c12", style: "orb" as const },
  { id: "demo-tessellate", title: "Tessellate", artist: "Ovrgrown", year: 2023, genres: ["Electronic", "IDM"], from: "#1f7a5a", to: "#08201a", style: "bars" as const },
  { id: "demo-midnight-arcadia", title: "Midnight Arcadia", artist: "Sable Youth", year: 2025, genres: ["Synth-pop"], from: "#8f2d56", to: "#231025", style: "orb" as const },
  { id: "demo-glass-orchard", title: "Glass Orchard", artist: "Ivo Renko", year: 2024, genres: ["Ambient", "Modern Classical"], from: "#4a6fa5", to: "#12203a", style: "arc" as const },
];

const MEMBERS = [
  { username: "setlst_demo", email: "demo@setlst.dev", bio: "Reviewing everything I listen to. App Review demo account." },
  { username: "rowan_fm", email: "rowan@demo.setlst.dev", bio: "Shoegaze apologist. Crate digger." },
  { username: "juno_tapes", email: "juno@demo.setlst.dev", bio: "Ambient, drone, and long walks." },
  { username: "hallie_b", email: "hallie@demo.setlst.dev", bio: "Alt-country and anything with a pedal steel." },
];

const REVIEWS = [
  { by: "setlst_demo", album: "demo-halcyon-static", rating: 9, subject: "The reverb is doing the emotional work", body: "Every guitar sounds like it's being remembered rather than played. The back half loses its nerve slightly, but the first four tracks are the best thing this band has done.", favorite: "Bleach Light", least: "Ninth Avenue" },
  { by: "setlst_demo", album: "demo-low-ceilings", rating: 7.5, subject: "Quietly devastating", body: "A breakup record that never raises its voice. Vale writes like someone describing a room she's already left.", favorite: "Porch Song" },
  { by: "setlst_demo", album: "demo-tessellate", rating: 6, subject: "Clever, cold", body: "Impeccably built and hard to love. I admire it more than I return to it.", favorite: "Fold" },
  { by: "rowan_fm", album: "demo-halcyon-static", rating: 10, subject: "Album of the year, no notes", body: "I've had this on since Friday and I'm not tired of it yet." },
  { by: "juno_tapes", album: "demo-glass-orchard", rating: 8.5, subject: "Music for a slow morning", body: "Renko leaves so much space that the room becomes part of the record." },
  { by: "hallie_b", album: "demo-low-ceilings", rating: 9, subject: "That pedal steel", body: "Track three has a steel line I've thought about every day this week." },
  { by: "rowan_fm", album: "demo-midnight-arcadia", rating: 7, subject: "Fun, a bit thin", body: "Great singles, less of an album than it thinks it is." },
];


// ---------------------------------------------------------------------------
// Real releases
// ---------------------------------------------------------------------------

/**
 * Well-known albums, looked up in the catalogue so the ids, artwork and years
 * are the real ones.
 *
 * Popular This Week ranks purely on this app's own activity, so with only a
 * handful of members it renders nearly empty. These give it something true to
 * show. Displaying real releases *inside* the app is what the Apple and Spotify
 * developer terms permit — the thing those terms don't cover is putting label
 * artwork in App Store marketing, which is why the screenshot content above is
 * invented instead.
 */
const REAL = [
  { artist: "Nas", album: "Illmatic", takes: [["rowan_fm", 10, "Still the benchmark", "Forty minutes, no filler, and every producer bringing their best beat. Nothing has aged."], ["juno_tapes", 9.5, "The New York record", "You can hear the window open on half these tracks."]] },
  { artist: "Radiohead", album: "In Rainbows", takes: [["setlst_demo", 9.5, "Their warmest record", "The one where the machinery finally serves the songs instead of hiding them. 15 Step still sounds like the future."], ["hallie_b", 9, "Nude", "That's it. That's the review."]] },
  { artist: "Amy Winehouse", album: "Back to Black", takes: [["setlst_demo", 9, "Every song is a standard", "Ronson's production points at the sixties and the writing is entirely her own."], ["rowan_fm", 8.5, "Devastating in hindsight", "Hard to hear now without knowing how it ends."]] },
  { artist: "Daft Punk", album: "Random Access Memories", takes: [["hallie_b", 8.5, "Session musicians and robots", "The long ones earn their length. Touch is the best thing they ever made."]] },
  { artist: "Kendrick Lamar", album: "To Pimp a Butterfly", takes: [["juno_tapes", 9.5, "Dense in the best way", "The jazz players are doing as much storytelling as the verses."], ["setlst_demo", 9, "Demands attention", "Not background music. Sit with it."]] },
  { artist: "Nirvana", album: "In Utero", takes: [["rowan_fm", 9, "Abrasive on purpose", "Albini put the band in a room and let them sound like one. Still bracing."]] },
  { artist: "SZA", album: "SOS", takes: [["hallie_b", 8, "Too long, still great", "Twenty-three tracks is a lot, but the highs are as high as anything last decade."]] },
  { artist: "Sufjan Stevens", album: "Illinois", takes: [["juno_tapes", 9, "Maximalist and tender", "Somehow both a history lesson and a diary."]] },
  { artist: "Tame Impala", album: "Currents", takes: [["setlst_demo", 8.5, "The break-up record as a pop album", "Every hook is a good idea followed all the way through."]] },
];

/**
 * Look an album up in the catalogue.
 *
 * Takes the ten best matches rather than the first, because the first is often
 * wrong: searching "Frank Ocean Blonde" returned "Moon River - Single". Full
 * lengths are preferred over singles and EPs, and the title is checked against
 * what was asked for, so a stray single can't stand in for the album.
 */
async function findReal(artistWanted: string, expect: string) {
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(`${artistWanted} ${expect}`)}&entity=album&limit=15`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const rows: Record<string, unknown>[] = (await r.json())?.results ?? [];

  const bare = (v: string) => v.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const want = bare(expect);
  const wantArtist = bare(artistWanted);
  // "Frank Ocean Blonde" matched "Piano Tribute to Frank Ocean" by Blond Piano,
  // so covers bands are excluded the same way the artist page excludes them.
  const TRIBUTE = /tribute|karaoke|piano versions?|made famous|in the style of|cover version/i;

  const scored = rows
    .filter((row) => row.collectionId && row.collectionName && row.artistName)
    .filter((row) => !TRIBUTE.test(String(row.collectionName)) && !TRIBUTE.test(String(row.artistName)))
    // The credited artist has to be the one asked for, not merely mentioned.
    .filter((row) => bare(String(row.artistName)).startsWith(wantArtist))
    .map((row) => {
      // Compare without edition wrapping, so "In Utero (20th Anniversary
      // Edition)" still counts as In Utero.
      const name = bare(String(row.collectionName).replace(/\s*[([][^)\]]*[)\]]/g, ""));
      const tracks = Number(row.trackCount ?? 0);
      return { row, exact: name === want, tracks };
    })
    // Exact only. "Currents" kept matching "Currents B-Sides & Remixes - EP" and
    // "Blonde" matched a single, because a prefix or substring match will always
    // find something and it is regularly the wrong thing. Better to seed one
    // fewer album than to seed the wrong one.
    .filter((c) => c.exact)
    .sort((a, b) => b.tracks - a.tracks);

  const row = scored[0]?.row;
  if (!row) return null;
  return {
    spotifyId: String(row.collectionId),
    title: String(row.collectionName).replace(/\s*[([](Deluxe|Expanded|Remastered|\d+th Anniversary)[^)\]]*[)\]]/i, "").trim(),
    artist: String(row.artistName),
    artwork: String(row.artworkUrl100 ?? "").replace("100x100bb", "600x600bb") || null,
    year: row.releaseDate ? parseInt(String(row.releaseDate).slice(0, 4)) : null,
    genres: row.primaryGenreName ? JSON.stringify([row.primaryGenreName]) : null,
  };
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);
  const now = new Date();
  const ago = (days: number) => new Date(now.getTime() - days * 86_400_000);

  // --- members -------------------------------------------------------------
  const users: Record<string, { id: string }> = {};
  for (const m of MEMBERS) {
    const data = {
      email: m.email,
      password: passwordHash,
      bio: m.bio,
      // Verified and consented, so a reviewer doesn't land on a "verify your
      // email" banner instead of the app.
      emailVerified: true,
      termsAcceptedAt: ago(30),
      termsVersion: TERMS_VERSION,
    };
    users[m.username] = await prisma.user.upsert({
      where: { username: m.username },
      create: { username: m.username, ...data },
      update: data,
      select: { id: true },
    });
    console.log(`  member  ${m.username}`);
  }

  // --- albums --------------------------------------------------------------
  const albums: Record<string, { id: string }> = {};
  for (const a of ALBUMS) {
    const data = {
      title: a.title,
      artist: a.artist,
      artwork: cover(a.title, a.from, a.to, a.style),
      year: a.year,
      genres: JSON.stringify(a.genres),
    };
    albums[a.id] = await prisma.album.upsert({
      where: { spotifyId: a.id },
      create: { spotifyId: a.id, ...data },
      update: data,
      select: { id: true },
    });
    console.log(`  album   ${a.title} — ${a.artist}`);
  }

  // --- reviews -------------------------------------------------------------
  // No natural unique key on (user, album), so existing demo reviews are cleared
  // first. Scoped to demo albums so nothing real is touched.
  const demoAlbumIds = Object.values(albums).map((a) => a.id);
  await prisma.review.deleteMany({ where: { albumId: { in: demoAlbumIds } } });
  for (const [i, r] of REVIEWS.entries()) {
    await prisma.review.create({
      data: {
        rating: r.rating,
        subject: r.subject,
        body: r.body,
        favoriteSong: r.favorite ?? null,
        leastFavoriteSong: r.least ?? null,
        userId: users[r.by].id,
        albumId: albums[r.album].id,
        createdAt: ago(i + 1),
      },
    });
  }
  console.log(`  reviews ${REVIEWS.length}`);

  // --- follows -------------------------------------------------------------
  // The demo account follows everyone and is followed back, so the friends feed
  // has content on first launch instead of an empty state.
  for (const m of MEMBERS.slice(1)) {
    for (const [a, b] of [
      [users.setlst_demo.id, users[m.username].id],
      [users[m.username].id, users.setlst_demo.id],
    ]) {
      await prisma.follow.upsert({
        where: { followerId_followingId: { followerId: a, followingId: b } },
        create: { followerId: a, followingId: b },
        update: {},
      });
    }
  }
  console.log(`  follows ${(MEMBERS.length - 1) * 2}`);

  // --- a discussion with replies ------------------------------------------
  // Gives App Review something to report that isn't the demo account's own
  // content — the report menu is hidden on your own posts.
  const album = ALBUMS[0];
  await prisma.thread.deleteMany({ where: { albumSpotifyId: album.id } });
  const thread = await prisma.thread.create({
    data: {
      title: "Is the second half a deliberate comedown?",
      body: "Four tracks of blown-out guitar and then it just… exhales. Sequencing choice or did they run out of songs?",
      albumSpotifyId: album.id,
      albumTitle: album.title,
      albumArtist: album.artist,
      albumArtwork: cover(album.title, album.from, album.to, album.style),
      userId: users.rowan_fm.id,
      createdAt: ago(3),
    },
    select: { id: true },
  });
  for (const [i, reply] of [
    { by: "juno_tapes", body: "Deliberate. The last three are the same chord progression slowed down each time." },
    { by: "hallie_b", body: "I always skip to track 9 and I'm not sorry about it." },
    { by: "setlst_demo", body: "Grew on me. It reads as an epilogue once you stop expecting another single." },
  ].entries()) {
    await prisma.threadReply.create({
      data: { body: reply.body, threadId: thread.id, userId: users[reply.by].id, createdAt: ago(2 - i * 0.5) },
    });
  }
  console.log("  thread  1 discussion + 3 replies");

  // --- a conversation ------------------------------------------------------
  // So the reporting and blocking flows in direct messages can be exercised too.
  await prisma.directMessage.deleteMany({
    where: { fromId: { in: [users.setlst_demo.id, users.rowan_fm.id] }, toId: { in: [users.setlst_demo.id, users.rowan_fm.id] } },
  });
  for (const [i, dm] of [
    { from: "rowan_fm", body: "Have you heard the new Sable Youth yet?" },
    { from: "setlst_demo", body: "Halfway through. The singles are great, the rest is a bit thin." },
    { from: "rowan_fm", body: "That's exactly what I said in my review. Great minds." },
  ].entries()) {
    await prisma.directMessage.create({
      data: {
        body: dm.body,
        fromId: users[dm.from].id,
        toId: dm.from === "rowan_fm" ? users.setlst_demo.id : users.rowan_fm.id,
        createdAt: ago(1 - i * 0.2),
      },
    });
  }
  console.log("  inbox   1 conversation");

  // --- real albums, so Popular This Week has something true to show ---------
  let realCount = 0, realReviews = 0;
  const seededRealIds: string[] = [];
  for (const [i, entry] of REAL.entries()) {
    const found = await findReal(entry.artist, entry.album);
    if (!found) { console.log(`  skipped ${entry.artist} — ${entry.album} (not in the iTunes store catalogue)`); continue; }
    const { spotifyId, ...data } = found;
    const album = await prisma.album.upsert({
      where: { spotifyId },
      create: { spotifyId, ...data },
      update: data,
      select: { id: true },
    });
    realCount++;
    seededRealIds.push(spotifyId);

    for (const [n, [by, rating, subject, body]] of entry.takes.entries()) {
      // Inside seven days, which is the window Popular This Week weights double.
      const createdAt = ago(((i + n) % 6) + 0.5);
      await prisma.review.upsert({
        where: { userId_albumId: { userId: users[by as string].id, albumId: album.id } },
        create: { rating: rating as number, subject: subject as string, body: body as string, userId: users[by as string].id, albumId: album.id, createdAt },
        update: { rating: rating as number, subject: subject as string, body: body as string, createdAt },
      });
      realReviews++;
    }
    console.log(`  real    ${data.title} — ${data.artist}`);
  }
  console.log(`  real albums ${realCount}, reviews ${realReviews}`);

  // --- clean up anything a previous run got wrong ---------------------------
  //
  // Matching used to be fuzzy, and it seeded a tribute album, a single, and a
  // B-sides EP before the exact-title rule went in. Those rows are still there
  // with demo reviews attached, so they keep appearing in Popular This Week.
  //
  // Only albums whose reviews are *entirely* from demo accounts are removed, and
  // only when this run didn't seed them — an album a real member has reviewed is
  // never touched, whatever its id.
  const demoUserIds = Object.values(users).map((u) => u.id);
  const keep = new Set([...seededRealIds, ...ALBUMS.map((a) => a.id)]);
  const candidates = await prisma.album.findMany({
    where: { reviews: { some: { userId: { in: demoUserIds } } } },
    select: { id: true, spotifyId: true, title: true, artist: true, reviews: { select: { userId: true } } },
  });
  let removed = 0;
  for (const a of candidates) {
    if (keep.has(a.spotifyId)) continue;
    const onlyDemo = a.reviews.every((r) => demoUserIds.includes(r.userId));
    if (!onlyDemo) continue;
    await prisma.review.deleteMany({ where: { albumId: a.id } });
    await prisma.album.delete({ where: { id: a.id } });
    console.log(`  removed ${a.title} — ${a.artist}  (mis-seeded)`);
    removed++;
  }
  if (removed) console.log(`  cleaned up ${removed} album(s) from earlier runs`);

  console.log(`\n  demo login:  setlst_demo  /  ${PASSWORD}`);
  console.log("  paste those into docs/APP_REVIEW_NOTES.md and App Store Connect.\n");
}

await main();
await prisma.$disconnect();
