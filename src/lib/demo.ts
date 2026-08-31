/**
 * Demo content, and where it is allowed to appear.
 *
 * scripts/seed-demo.mts creates fictional albums so the App Store screenshots
 * contain no artwork owned by a label. They live in the same tables as real
 * releases, which is what makes the screenshots convincing — and also what made
 * them leak: Popular This Week ranks by review activity, the seed wrote seven
 * reviews, and invented bands duly appeared in every user's discovery feed
 * looking exactly like machine-generated filler.
 *
 * The rule is that demo content is reachable but not *discoverable*. It stays on
 * the demo account's profile, its own album pages and the feeds of anyone who
 * follows those accounts — everything App Review and the screenshots need — and
 * is kept out of the global surfaces that are meant to reflect what real people
 * are actually listening to.
 */

/** Album ids created by the demo seed. Chosen so it can't collide with a real id. */
export const DEMO_ALBUM_PREFIX = "demo-";

export function isDemoAlbumId(id: string | null | undefined): boolean {
  return !!id && id.startsWith(DEMO_ALBUM_PREFIX);
}

/** Prisma filter excluding seeded albums from a query on a spotifyId column. */
export const notDemoAlbum = { not: { startsWith: DEMO_ALBUM_PREFIX } };
