"use client";
import { useEffect, useRef, useState } from "react";
import { isNative } from "@/lib/native";

// First-launch onboarding slideshow. Shows once, the first time the app is opened
// on a device (native app), then never again (persisted in localStorage). A full-
// screen overlay with swipeable slides, dots, Skip, and a Get Started CTA.
const SEEN_KEY = "setlst_onboarded_v1";

type RandomAlbum = { title: string; artist: string; artwork: string };
type DiscoverAlbum = { title: string; artist: string; artwork: string; genre: string };
type OnbConcert = { id: string; name: string; date: string; venue: string; city: string; image: string | null };

// "Fri, Aug 8" — compact date for the concert preview rows.
function shortDate(d: string) {
  const dt = new Date(d + "T00:00:00");
  return isNaN(dt.getTime()) ? "" : dt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

type Slide = { icon: React.ReactNode; title: string; body: string };

const SLIDES: Slide[] = [
  {
    icon: <img src="/turntable-logo.png" alt="" className="w-44 h-44 object-contain drop-shadow-[0_8px_30px_rgba(196,168,50,0.25)]" />,
    title: "Welcome to SETLST",
    body: "Your all-in-one music database and review hub — track everything you listen to.",
  },
  {
    // Slide index 1 ("Log & rate every album") shows a random popular album
    // cover instead of this fallback icon once it loads — see `album` state.
    icon: <span className="text-8xl" aria-hidden>💿</span>,
    title: "Log & rate every album",
    body: "Rate your favorites, write reviews, and build a diary of what you're spinning.",
  },
  {
    icon: <span className="text-8xl" aria-hidden>🔎</span>,
    title: "Discover your next favorite",
    body: "New releases, hidden gems, and deep cuts across every genre — powered by what you actually listen to.",
  },
  {
    icon: <span className="text-8xl" aria-hidden>🎟️</span>,
    title: "Catch shows near you",
    body: "See concerts nearby from the artists in your rotation, and mark the ones you're going to.",
  },
  {
    icon: <span className="text-8xl" aria-hidden>👥</span>,
    title: "Follow friends",
    body: "See what your friends are rating, share your picks, and start the conversation.",
  },
];

export default function OnboardingSlideshow() {
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);
  const [album, setAlbum] = useState<RandomAlbum | null>(null);
  const [discover, setDiscover] = useState<DiscoverAlbum[]>([]);
  const [concerts, setConcerts] = useState<OnbConcert[]>([]);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (isNative() && !localStorage.getItem(SEEN_KEY)) {
        setShow(true);
        // Pull a random popular album for the "Log & rate every album" slide.
        // Fails silently — the slide falls back to the disc icon.
        fetch("/api/onboarding/album")
          .then((r) => (r.ok ? r.json() : null))
          .then((a: RandomAlbum | null) => {
            if (a && a.artwork) setAlbum(a);
          })
          .catch(() => {});
        // Pull 4 albums across different genres for the "Discover" slide.
        // Fails silently — the slide falls back to the magnifying-glass icon.
        fetch("/api/onboarding/discover")
          .then((r) => (r.ok ? r.json() : []))
          .then((d: DiscoverAlbum[]) => {
            if (Array.isArray(d) && d.length >= 4) setDiscover(d.slice(0, 4));
          })
          .catch(() => {});
        // Pull a few upcoming concerts for the "Catch shows near you" slide.
        // Fails silently — the slide falls back to the ticket icon.
        fetch("/api/onboarding/concerts")
          .then((r) => (r.ok ? r.json() : []))
          .then((c: OnbConcert[]) => {
            if (Array.isArray(c) && c.length) setConcerts(c);
          })
          .catch(() => {});
      }
    } catch {}
  }, []);

  if (!show) return null;

  const last = i === SLIDES.length - 1;
  const finish = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    setShow(false);
    // Let NativeBridge request push permission now that onboarding is dismissed,
    // so the system dialog doesn't cover the welcome screen on first launch.
    try { window.dispatchEvent(new Event("setlst:onboarded")); } catch {}
  };
  const next = () => (last ? finish() : setI((n) => n + 1));

  const prev = () => setI((n) => Math.max(0, n - 1));

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const endX = e.changedTouches[0].clientX;
    const dx = endX - startX.current;
    startX.current = null;
    // Don't hijack taps on the actual controls (Skip / dots / CTA).
    if ((e.target as HTMLElement).closest("button")) return;
    // Swipe past the threshold: drag left = next, right = previous.
    if (Math.abs(dx) >= 50) {
      if (dx < 0) next();
      else prev();
      return;
    }
    // Tap: left half of the screen goes back, right half advances — like a
    // story/reel. On the last slide, a right-tap does nothing (only the CTA
    // finishes) so onboarding isn't dismissed by accident.
    if (endX < window.innerWidth / 2) prev();
    else if (!last) setI((n) => n + 1);
  };

  const s = SLIDES[i];

  return (
    <div
      className="onb-overlay fixed inset-0 z-[100] flex flex-col text-[#f0f0f0] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Skip */}
      <div className="flex justify-end px-5 pt-4">
        <button onClick={finish} className="text-sm text-[#8a8a8a] hover:text-[#c4a832] px-3 py-1.5 rounded-full transition-colors">
          Skip
        </button>
      </div>

      {/* Slide */}
      <div key={i} className="flex-1 flex flex-col items-center justify-center px-8 text-center onb-slide">
        {i === 2 && discover.length === 4 ? (
          // "Discover your next favorite" — an assorted 2×2 of albums across
          // different genres, with a magnifying glass over one of them.
          <div className="mb-10 grid grid-cols-2 gap-3">
            {discover.map((d, idx) => (
              <div key={idx} className="relative">
                <img
                  src={d.artwork}
                  alt=""
                  className="h-28 w-28 rounded-xl object-cover shadow-xl shadow-black/50 ring-1 ring-white/10"
                />
                {/* Magnifying glass on the first tile — the "discover" cue. */}
                {idx === 0 && (
                  <div className="onb-float absolute -right-3 -bottom-3 flex h-14 w-14 items-center justify-center rounded-full bg-[#c4a832] text-[#1a1408] shadow-lg shadow-[#c4a832]/40 ring-2 ring-[#111]">
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <circle cx="11" cy="11" r="7" />
                      <line x1="21" y1="21" x2="16.5" y2="16.5" />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : i === 3 && concerts.length > 0 ? (
          // "Catch shows near you" — a live preview of upcoming local concerts.
          <div className="mb-10 w-full max-w-xs space-y-2.5">
            {concerts.map((c) => (
              <div key={c.id} className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-2.5 text-left">
                {c.image ? (
                  <img src={c.image} alt="" className="h-11 w-11 shrink-0 rounded-lg object-cover" />
                ) : (
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-white/10 text-lg" aria-hidden>🎟️</div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#f0f0f0]">{c.name}</p>
                  <p className="truncate text-xs text-[#8a8a8a]">{[c.venue, c.city].filter(Boolean).join(" · ")}</p>
                </div>
                <span className="shrink-0 text-[11px] font-medium text-[#c4a832]">{shortDate(c.date)}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative mb-12 flex h-52 w-52 items-center justify-center">
            {/* radial gold glow behind the icon */}
            <div className="onb-glow absolute inset-0 rounded-full" />
            <div className="onb-float relative flex items-center justify-center">
              {i === 1 && album ? (
                <div className="flex flex-col items-center">
                  <img
                    src={album.artwork}
                    alt=""
                    className="w-44 h-44 rounded-xl object-cover shadow-2xl shadow-black/60 ring-1 ring-white/10"
                  />
                  <p className="mt-3 text-sm font-semibold text-[#f0f0f0] max-w-[12rem] truncate">{album.title}</p>
                  <p className="text-xs text-[#8a8a8a] max-w-[12rem] truncate">{album.artist}</p>
                </div>
              ) : (
                s.icon
              )}
            </div>
          </div>
        )}
        <h1 className="font-serif text-4xl leading-[1.1] tracking-tight mb-4">{s.title}</h1>
        <p className="text-[#a8a8a8] text-[15px] leading-relaxed max-w-sm">{s.body}</p>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mb-7">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Slide ${idx + 1}`}
            className={`h-2 rounded-full transition-all duration-300 ${idx === i ? "w-7 bg-[#c4a832] shadow-[0_0_10px_rgba(196,168,50,0.6)]" : "w-2 bg-[#3a3a3a]"}`}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-9">
        <button
          onClick={next}
          className="w-full bg-gradient-to-b from-[#d4ba44] to-[#c4a832] hover:brightness-110 active:scale-[0.98] text-[#1a1408] font-bold tracking-wide py-4 rounded-2xl shadow-lg shadow-[#c4a832]/20 transition-all"
        >
          {last ? "Get Started" : "Next"}
        </button>
      </div>
    </div>
  );
}
