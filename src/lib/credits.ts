// Reading artist credits out of a flat string.
//
// Neither Spotify nor iTunes gives us a clean list of everyone on a release.
// iTunes gives one `artistName` string and one `artistId`, so "My Life
// (feat. Tame Impala)" arrives as artistName "ZHU" with Tame Impala mentioned
// only in the title. Nobody is going to find that release on Tame Impala's page,
// and the album page credited it to ZHU alone.
//
// There is no parse that's right every time — "Florence and the Machine" and
// "Post Malone & The Weeknd" have the same shape and opposite meanings. So there
// are two functions here with deliberately different appetites for risk:
//
//   matchesCredit()  — used to FILTER a discography. Splits aggressively. Being
//                      wrong adds one extra row to an artist page.
//   displayCredits() — used to RENDER the credit line. Splits only on markers
//                      that can't be part of a name. Being wrong is visible on
//                      every album page, so it stays conservative.

/**
 * Separators that are never part of an artist's own name. "feat." and its
 * variants introduce a guest by definition, so splitting on them is always safe.
 */
const FEATURE_MARKER = /\s*(?:\bfeat\b\.?|\bfeaturing\b|\bft\b\.?|\bwith\b|\bx\b|\bvs\b\.?|\/)\s*/i;

/**
 * The looser set, adding the separators that *usually* mean a collaboration but
 * sometimes live inside a single name — the comma of "Tyler, The Creator", the
 * ampersand of "Earth, Wind & Fire", the "and" of "Florence and the Machine".
 */
const ANY_SEPARATOR = /\s*(?:,|&|\band\b|\bfeat\b\.?|\bfeaturing\b|\bft\b\.?|\bwith\b|\bx\b|\bvs\b\.?|\/)\s*/i;

/** A guest named only in the title: "My Life (feat. Tame Impala) - Single". */
const TITLE_FEATURE = /\((?:feat\b\.?|featuring|ft\b\.?|with)\s+([^)]+)\)/i;

function norm(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function unique(names: string[]): string[] {
  const seen = new Set<string>();
  return names.filter((n) => {
    const key = norm(n);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Everyone credited on a release, for matching against one artist.
 *
 * Compares whole names rather than substrings, so "Drake & Future" credits
 * Future while "Drake Bell" is never mistaken for Drake.
 */
export function creditedArtists(artistName: string): string[] {
  return artistName.split(ANY_SEPARATOR).map((p) => p.trim()).filter(Boolean);
}

/** True when `target` is one of the artists credited on a release. */
export function matchesCredit(
  artistName: string | undefined,
  title: string | undefined,
  target: string
): boolean {
  const want = norm(target);
  if (!want) return false;
  if (artistName && creditedArtists(artistName).some((n) => norm(n) === want)) return true;
  const feat = title?.match(TITLE_FEATURE);
  if (feat) return creditedArtists(feat[1]).some((n) => norm(n) === want);
  return false;
}

/**
 * The artists to show under a title, in credit order, each one linkable.
 *
 * Splits on the comma — which is structural here, since the album artist string
 * is built by joining Spotify's artist list — and on feature markers, which
 * can't be part of a name. It deliberately does NOT split a bare "&" or "and":
 * those appear inside band names often enough ("Florence and the Machine",
 * "Nick Cave and the Bad Seeds") that splitting them would break more credits
 * than it fixes. "Post Malone & The Weeknd" therefore stays one link — an
 * under-split, which reads fine, rather than an invented artist, which doesn't.
 */
export function displayCredits(artistName: string, title?: string): string[] {
  const primary = artistName
    .split(",")
    .flatMap((part) => part.split(FEATURE_MARKER))
    .map((p) => p.trim())
    .filter(Boolean);

  // A guest named only in the title is still an artist on the release.
  const feat = title?.match(TITLE_FEATURE);
  const guests = feat
    ? feat[1].split(ANY_SEPARATOR).map((p) => p.trim()).filter(Boolean)
    : [];

  return unique([...primary, ...guests]);
}

/** The title with its "(feat. …)" removed, since the guests are shown as credits. */
export function titleWithoutFeature(title: string): string {
  return title.replace(TITLE_FEATURE, "").replace(/\s{2,}/g, " ").trim();
}
