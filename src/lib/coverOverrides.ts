// Cover art overrides for albums whose original art isn't on Apple Music
// (e.g. MF DOOM catalog gaps), so we don't fall back to instrumentals/placeholder.
const OVERRIDES: { title: RegExp; artist: RegExp; url: string }[] = [
  {
    title: /madvillainy/i,
    artist: /madvillain/i,
    url: "https://i.scdn.co/image/ab67616d0000b2733e3bb917af94bd82074c5d47",
  },
];

export function coverOverride(title?: string | null, artist?: string | null): string | null {
  if (!title || !artist) return null;
  const hit = OVERRIDES.find((o) => o.title.test(title) && o.artist.test(artist));
  return hit?.url ?? null;
}
