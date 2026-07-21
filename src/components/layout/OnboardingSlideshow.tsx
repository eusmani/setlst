"use client";
import { useEffect, useRef, useState } from "react";
import { isNative } from "@/lib/native";

// First-launch onboarding slideshow. Shows once, the first time the app is opened
// on a device (native app), then never again (persisted in localStorage). A full-
// screen overlay with swipeable slides, dots, Skip, and a Get Started CTA.
const SEEN_KEY = "setlst_onboarded_v1";

type Slide = { icon: React.ReactNode; title: string; body: string };

const SLIDES: Slide[] = [
  {
    icon: <img src="/turntable-logo.png" alt="" className="w-24 h-24 object-contain" />,
    title: "Welcome to SETLST",
    body: "Your all-in-one music database and review hub — track everything you listen to.",
  },
  {
    icon: <span className="text-6xl" aria-hidden>💿</span>,
    title: "Log & rate every album",
    body: "Rate your favorites, write reviews, and build a diary of what you're spinning.",
  },
  {
    icon: <span className="text-6xl" aria-hidden>🔎</span>,
    title: "Discover your next favorite",
    body: "New releases, hidden gems, and deep cuts across every genre — powered by what you actually listen to.",
  },
  {
    icon: <span className="text-6xl" aria-hidden>🎟️</span>,
    title: "Catch shows near you",
    body: "See concerts nearby from the artists in your rotation, and mark the ones you're going to.",
  },
  {
    icon: <span className="text-6xl" aria-hidden>👥</span>,
    title: "Follow friends",
    body: "See what your friends are rating, share your picks, and start the conversation.",
  },
];

export default function OnboardingSlideshow() {
  const [show, setShow] = useState(false);
  const [i, setI] = useState(0);
  const startX = useRef<number | null>(null);

  useEffect(() => {
    try {
      if (isNative() && !localStorage.getItem(SEEN_KEY)) setShow(true);
    } catch {}
  }, []);

  if (!show) return null;

  const last = i === SLIDES.length - 1;
  const finish = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    setShow(false);
  };
  const next = () => (last ? finish() : setI((n) => n + 1));

  const onTouchStart = (e: React.TouchEvent) => { startX.current = e.touches[0].clientX; };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (startX.current == null) return;
    const dx = e.changedTouches[0].clientX - startX.current;
    startX.current = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0) next();
    else setI((n) => Math.max(0, n - 1));
  };

  const s = SLIDES[i];

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col bg-[#111111] text-[#f0f0f0] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Skip */}
      <div className="flex justify-end px-5 pt-4">
        <button onClick={finish} className="text-sm text-[#6b6b6b] hover:text-[#a0a0a0] px-2 py-1 transition-colors">
          Skip
        </button>
      </div>

      {/* Slide */}
      <div key={i} className="flex-1 flex flex-col items-center justify-center px-8 text-center onb-slide">
        <div className="mb-8 flex items-center justify-center h-28">{s.icon}</div>
        <h1 className="font-serif text-3xl leading-tight mb-3">{s.title}</h1>
        <p className="text-[#a0a0a0] text-base leading-relaxed max-w-sm">{s.body}</p>
      </div>

      {/* Dots */}
      <div className="flex justify-center gap-2 mb-6">
        {SLIDES.map((_, idx) => (
          <button
            key={idx}
            onClick={() => setI(idx)}
            aria-label={`Slide ${idx + 1}`}
            className={`h-2 rounded-full transition-all ${idx === i ? "w-6 bg-[#c4a832]" : "w-2 bg-[#3a3a3a]"}`}
          />
        ))}
      </div>

      {/* CTA */}
      <div className="px-6 pb-8">
        <button
          onClick={next}
          className="w-full bg-[#c4a832] hover:bg-[#d4ba44] active:scale-[0.99] text-[#111111] font-semibold py-3.5 rounded-xl transition-all"
        >
          {last ? "Get Started" : "Next"}
        </button>
      </div>
    </div>
  );
}
