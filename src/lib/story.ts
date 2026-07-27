// Shared description of a "story card" — the shareable image of a review that
// gets posted to Instagram Stories. Lives outside any "use client" module so the
// image route (server) and the share sheet (client) agree on the same shape.
import { ratingTier } from "@/lib/rating";

export interface StoryPayload {
  title: string;
  artist: string;
  artwork?: string | null;
  rating: number;
  subject?: string | null;
  body?: string | null;
  username?: string | null;
  /** Album page the story links back to, e.g. "/album/4aawyAB9vmqN3uQ7FjRGTy". */
  path?: string | null;
}

export type StoryVariant = "story" | "sticker";

// Field caps, applied on both sides so the client can't build a URL the route
// would silently truncate differently.
const LIMITS = { title: 80, artist: 80, subject: 90, body: 200, username: 40 } as const;

// Bump whenever the card's design changes. The rendered PNG is served
// `immutable`, so without a token in the URL a client that already fetched a
// card keeps showing the old artwork — the URL is otherwise identical, and
// there's nothing to tell the browser to look again.
const CARD_VERSION = "2";

export function storyImageUrl(p: StoryPayload, variant: StoryVariant = "story"): string {
  const q = new URLSearchParams({
    v: variant,
    r: CARD_VERSION,
    title: (p.title ?? "").slice(0, LIMITS.title),
    artist: (p.artist ?? "").slice(0, LIMITS.artist),
    artwork: p.artwork ?? "",
    rating: String(p.rating ?? 0),
    subject: (p.subject ?? "").slice(0, LIMITS.subject),
    body: (p.body ?? "").slice(0, LIMITS.body),
    username: (p.username ?? "").slice(0, LIMITS.username),
  });
  return `/api/review/story?${q.toString()}`;
}

// Blend two #rrggbb colors. `amount` is how much of `a` survives.
function mixHex(a: string, b: string, amount: number): string {
  const parse = (h: string) => {
    const n = parseInt(h.replace("#", ""), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };
  const [r1, g1, b1] = parse(a);
  const [r2, g2, b2] = parse(b);
  const ch = (x: number, y: number) =>
    Math.round(x * amount + y * (1 - amount)).toString(16).padStart(2, "0");
  return `#${ch(r1, r2)}${ch(g1, g2)}${ch(b1, b2)}`;
}

export const STORY_BG = "#0b0b0b";

/** The card's accent: the grade's colour, or the app's amber when unreviewed. */
export function storyAccent(rating: number): string {
  return rating > 0 ? ratingTier(rating).color : "#c4a832";
}

// The two-stop gradient Instagram paints behind the sticker. Tinted by the
// grade so an S-tier story reads gold and an F reads red, like the app does.
export function storyGradient(rating: number): { top: string; bottom: string } {
  return { top: mixHex(storyAccent(rating), STORY_BG, 0.28), bottom: STORY_BG };
}
