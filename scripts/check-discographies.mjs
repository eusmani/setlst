// Are artist pages actually showing discographies?
//
// Every previous instance of this bug was found by a person opening a page and
// seeing "No releases found" — a throttled response, an unnormalised accent, a
// cached empty. None of them broke a build or logged an error, so nothing but a
// human noticed. This asks the live site directly.
//
//   node scripts/check-discographies.mjs [baseUrl]
//
// Exits non-zero if any artist comes back empty, so it can gate a deploy or run
// on a schedule.

const BASE = process.argv[2] ?? "https://setlst.dev";

// A spread of the shapes that have broken before: an accent, a name shared by
// several acts, one-word names, a name with punctuation, and plain popular ones.
const ARTISTS = [
  "Beyoncé", "Sigur Rós", "Mötley Crüe",
  "Geese", "Earl Sweatshirt", "Gunna",
  "SZA", "Drake", "Radiohead", "Tame Impala",
  "Fontaines D.C.", "Tyler, The Creator",
  "Metro Boomin", "Doechii", "Playboi Carti",
  // Names shared with a smaller act of the same spelling — the catalogue's
  // ordering used to decide which one the page showed.
  "Zedd", "Justice", "Gunna", "Prince", "Air", "Sade", "Muse",
];

const results = await Promise.all(
  ARTISTS.map(async (name) => {
    const url = `${BASE}/artist/${encodeURIComponent(name)}?_=${Date.now()}`;
    try {
      const html = await (await fetch(url, { cache: "no-store" })).text();
      return { name, albums: (html.match(/href="\/album\//g) ?? []).length };
    } catch (error) {
      return { name, albums: 0, error: String(error?.message ?? error) };
    }
  })
);

let empty = 0;
for (const r of results.sort((a, b) => a.albums - b.albums)) {
  if (r.albums === 0) empty++;
  console.log(`  ${r.albums === 0 ? "EMPTY" : "  ok "}  ${String(r.albums).padStart(3)}  ${r.name}${r.error ? `  (${r.error})` : ""}`);
}

console.log(empty ? `\n${empty}/${results.length} artists have no discography` : `\nall ${results.length} artists have releases`);
process.exit(empty ? 1 : 0);
