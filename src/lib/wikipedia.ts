// Fetch a real album description from Wikipedia (free, no auth).
export async function getAlbumDescription(title: string, artist: string): Promise<string | null> {
  try {
    const query = `${title} ${artist} album`;
    const url =
      `https://en.wikipedia.org/w/api.php?action=query&generator=search` +
      `&gsrsearch=${encodeURIComponent(query)}&gsrlimit=1` +
      `&prop=extracts&exintro&explaintext&format=json&redirects=1`;

    const res = await fetch(url, {
      headers: { "User-Agent": "SETLST/1.0 (music review app)" },
      next: { revalidate: 604800 }, // cache a week
    });
    if (!res.ok) return null;

    const data = await res.json();
    const pages = data?.query?.pages;
    if (!pages) return null;

    const page = Object.values(pages)[0] as { extract?: string; title?: string };
    let extract = page?.extract?.trim();
    if (!extract) return null;

    // Bias check: must read like an album/record article
    if (!/\b(album|EP|mixtape|record|soundtrack)\b/i.test(extract.slice(0, 240))) {
      return null;
    }

    // Trim to ~4 sentences / ~560 chars at a sentence boundary
    if (extract.length > 560) {
      const cut = extract.slice(0, 560);
      const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf(".\n"));
      extract = (lastStop > 240 ? cut.slice(0, lastStop + 1) : cut + "…");
    }
    return extract;
  } catch {
    return null;
  }
}
