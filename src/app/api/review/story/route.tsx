import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { ratingTier } from "@/lib/rating";
import { STORY_BG, storyGradient } from "@/lib/story";

export const runtime = "edge";

// The shareable review card, rendered server-side so album art (cross-origin
// from Spotify / Apple Music) can be drawn without tainting a canvas.
//
// Two variants come out of the same card art:
//   ?v=story    1080×1920 full-bleed — the fallback image people save or push
//               through the system share sheet.
//   ?v=sticker  900×1500 transparent — handed to Instagram as a sticker so it
//               can be dragged and resized over a grade-tinted gradient, the
//               way Spotify's "share to story" behaves.
const CARD_W = 900;
const CARD_H = 1500;

const ART_HOSTS = [
  "i.scdn.co",
  "mosaic.scdn.co",
  "image-cdn-ak.spotifycdn.com",
  "image-cdn-fa.spotifycdn.com",
  "is1-ssl.mzstatic.com",
  "is2-ssl.mzstatic.com",
  "is3-ssl.mzstatic.com",
  "is4-ssl.mzstatic.com",
  "is5-ssl.mzstatic.com",
];

// Only draw artwork we know comes from the music catalogs — the route is public,
// so an arbitrary `artwork` URL would make it a fetch proxy.
function safeArtwork(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:") return "";
    return ART_HOSTS.includes(u.hostname) ? u.toString() : "";
  } catch {
    return "";
  }
}

// Satori only takes ttf/otf/woff — Google serves woff2 to anything modern, hence
// the vintage user agent. Returns null so a font outage degrades to the built-in
// sans instead of failing the whole image.
async function googleFont(family: string, weight: 400 | 700 | 800, text: string) {
  try {
    const css = await fetch(
      `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&text=${encodeURIComponent(text)}`,
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_6_8) AppleWebKit/534.30 (KHTML, like Gecko) Version/5.1 Safari/534.30",
        },
      },
    ).then((r) => r.text());
    const url = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype|woff)'\)/)?.[1];
    if (!url) return null;
    const data = await fetch(url).then((r) => r.arrayBuffer());
    return { name: family, data, weight, style: "normal" as const };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const variant = sp.get("v") === "sticker" ? "sticker" : "story";
  const title = (sp.get("title") ?? "").slice(0, 80);
  const artist = (sp.get("artist") ?? "").slice(0, 80);
  const artwork = safeArtwork(sp.get("artwork") ?? "");
  const rating = Number(sp.get("rating") ?? "0");
  const subject = (sp.get("subject") ?? "").slice(0, 90);
  const body = (sp.get("body") ?? "").slice(0, 200);
  const username = (sp.get("username") ?? "").slice(0, 40);

  const tier = ratingTier(rating || 1);
  const grad = storyGradient(rating);
  // Google subsets the font to exactly the characters asked for, so every glyph
  // the card draws has to be listed here or it silently falls back mid-word.
  const prose = `${title}${artist}${subject}${body}${username}${tier.letter}${tier.word.toUpperCase()}SETLST@·setlst.dev“”`;

  // Body copy stays on the app's own family; the wordmark is set in Arimo Bold.
  // Helvetica itself is proprietary and can't be fetched or embedded here, and
  // Arimo is its metric-compatible open equivalent (same widths as Arial, which
  // is itself drawn to Helvetica's metrics) — so it sets like Helvetica Bold.
  const [regular, bold, display] = await Promise.all([
    googleFont("Plus Jakarta Sans", 400, prose),
    googleFont("Plus Jakarta Sans", 800, prose),
    googleFont("Arimo", 700, "SETLST"),
  ]);
  const fonts = [regular, bold, display].filter((f) => f !== null);

  const sans = regular || bold ? "Plus Jakarta Sans" : "sans-serif";
  const wordmarkFont = display ? "Arimo" : sans;

  const card = (
    <div
      style={{
        width: `${CARD_W}px`,
        height: `${CARD_H}px`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "34px",
        padding: "64px 60px",
        borderRadius: "56px",
        border: `2px solid ${tier.color}33`,
        background: `linear-gradient(170deg, #17171a 0%, #0e0e10 100%)`,
        fontFamily: sans,
      }}
    >
      {/* Wordmark — Helvetica Bold (via Arimo, see above). */}
      <div
        style={{
          fontFamily: wordmarkFont,
          fontSize: "46px",
          fontWeight: 700,
          letterSpacing: "1.2px",
          color: "#f0f0f0",
        }}
      >
        SETLST
      </div>

      {/* Album art */}
      {artwork ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={artwork}
          width={480}
          height={480}
          alt=""
          style={{ borderRadius: "28px", objectFit: "cover" }}
        />
      ) : (
        <div style={{ display: "flex", width: "480px", height: "480px", borderRadius: "28px", background: "#1e1e22" }} />
      )}

      {/* Album + artist */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", maxWidth: "760px" }}>
        <div style={{ fontSize: "56px", fontWeight: 800, color: "#f0f0f0", textAlign: "center", lineHeight: 1.12 }}>
          {title}
        </div>
        <div style={{ fontSize: "36px", color: "#9a9aa2", textAlign: "center", lineHeight: 1.2 }}>{artist}</div>
      </div>

      {/* Grade */}
      <div style={{ display: "flex", alignItems: "center", gap: "22px" }}>
        <div
          style={{
            display: "flex",
            width: "104px",
            height: "104px",
            borderRadius: "52px",
            border: `5px solid ${tier.color}`,
            background: `${tier.color}1f`,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: "54px", fontWeight: 800, color: tier.color }}>{tier.letter}</div>
        </div>
        <div style={{ fontSize: "38px", fontWeight: 800, letterSpacing: "4px", color: tier.color }}>
          {tier.word.toUpperCase()}
        </div>
      </div>

      {/* The review itself */}
      {subject || body ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "14px", maxWidth: "740px" }}>
          {subject ? (
            <div style={{ fontSize: "40px", fontWeight: 800, color: "#f0f0f0", textAlign: "center", lineHeight: 1.2 }}>
              {subject}
            </div>
          ) : null}
          {body ? (
            <div style={{ fontSize: "32px", color: "#b8b8c0", textAlign: "center", lineHeight: 1.42 }}>
              {`“${body}”`}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Byline */}
      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "6px" }}>
        {username ? (
          <div style={{ fontSize: "32px", fontWeight: 800, color: tier.color }}>{`@${username}`}</div>
        ) : null}
        {username ? <div style={{ fontSize: "28px", color: "#4d4d55" }}>·</div> : null}
        <div style={{ fontSize: "28px", color: "#6b6b73" }}>setlst.dev</div>
      </div>
    </div>
  );

  const size =
    variant === "sticker" ? { width: CARD_W, height: CARD_H } : { width: 1080, height: 1920 };

  const image =
    variant === "sticker" ? (
      // Transparent canvas: Instagram composites this over its own background.
      <div style={{ display: "flex", width: "100%", height: "100%", background: "transparent" }}>{card}</div>
    ) : (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          alignItems: "center",
          justifyContent: "center",
          background: `linear-gradient(180deg, ${grad.top} 0%, ${STORY_BG} 62%, ${grad.bottom} 100%)`,
        }}
      >
        {card}
      </div>
    );

  try {
    return new ImageResponse(image, {
      ...size,
      fonts: fonts.length ? fonts : undefined,
      headers: {
        // Every pixel is derived from the query string, so the CDN can hold onto it.
        "Cache-Control": "public, max-age=3600, s-maxage=31536000, immutable",
      },
    });
  } catch (e) {
    console.error("story image failed", e);
    return new Response("Could not render the story card", { status: 500 });
  }
}
