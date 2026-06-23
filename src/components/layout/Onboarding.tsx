"use client";
import { useEffect, useState } from "react";
import { GRADES } from "@/lib/rating";
import TurntableLogo from "@/components/ui/TurntableLogo";

const FLAG = "setlst-onboarded";

const GENRES = [
  "Hip-Hop", "Rap", "R&B", "Rock", "Alternative", "Indie",
  "Metal", "Hardcore", "Jazz", "Soul", "Electronic", "Pop",
  "Shoegaze", "Punk", "Country", "Latin", "Lo-Fi", "Ambient",
];

export default function Onboarding() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState(0);
  const [prefs, setPrefs] = useState<Set<string>>(new Set());
  const [locState, setLocState] = useState<"idle" | "asking" | "done">("idle");
  const STEPS = 5;

  useEffect(() => {
    try {
      const seen = localStorage.getItem(FLAG);
      const isMobile = window.matchMedia("(max-width: 767px)").matches || window.matchMedia("(pointer: coarse)").matches;
      if (!seen && isMobile) setShow(true);
    } catch {}
  }, []);

  function finish() {
    try {
      localStorage.setItem(FLAG, "1");
      if (prefs.size) localStorage.setItem("setlst-prefs", JSON.stringify([...prefs]));
    } catch {}
    setShow(false);
  }

  function next() {
    if (step >= STEPS - 1) finish();
    else setStep((s) => s + 1);
  }
  function back() {
    setStep((s) => Math.max(0, s - 1));
  }

  function togglePref(g: string) {
    setPrefs((prev) => {
      const n = new Set(prev);
      n.has(g) ? n.delete(g) : n.add(g);
      return n;
    });
  }

  async function askLocation() {
    setLocState("asking");
    const { getCoords } = await import("@/lib/native");
    try { await getCoords(); } catch {}
    setLocState("done");
    next();
  }

  async function connectContacts() {
    const { readContactPhones } = await import("@/lib/native");
    const phones = await readContactPhones();
    // No native/web contacts available → fall back to a share invite.
    if (phones === null && navigator.share) {
      try {
        await navigator.share({
          title: "Join me on SETLST",
          text: "I'm logging my music on SETLST — come rate albums with me!",
          url: "https://reruns.vercel.app",
        });
      } catch {
        /* cancelled */
      }
    }
    finish();
  }

  if (!show) return null;

  const sideArrow =
    "absolute top-1/2 -translate-y-1/2 z-20 w-12 h-12 rounded-full bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center text-[#f0f0f0] shadow-lg active:bg-[#222222] transition-colors";
  const footArrow =
    "w-10 h-10 rounded-full border border-[#2e2e2e] bg-[#1a1a1a] flex items-center justify-center text-[#f0f0f0] active:bg-[#222222] transition-colors disabled:opacity-25";

  return (
    <div className="sm:hidden fixed inset-0 z-[100] bg-[#111111] flex flex-col text-[#f0f0f0]">
      {/* progress dots + skip */}
      <div className="flex items-center justify-between px-5 pt-5">
        <div className="flex gap-1.5">
          {Array.from({ length: STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-1 rounded-full transition-all ${i === step ? "w-6 bg-[#c4a832]" : i < step ? "w-3 bg-[#c4a832]" : "w-3 bg-[#2e2e2e]"}`}
            />
          ))}
        </div>
        <button onClick={finish} className="text-xs text-[#6b6b6b] hover:text-[#f0f0f0] transition-colors">Skip</button>
      </div>

      <div key={step} className="flex-1 overflow-y-auto px-6 pt-8 pb-4 slide-in-onb">
        {/* ── 0. Welcome ───────────────────────────── */}
        {step === 0 && (
          <div className="flex flex-col items-center text-center pt-10">
            <TurntableLogo className="w-28 h-28 text-[#c4a832] mb-6" />
            <h1 className="font-serif text-4xl font-bold mb-3 tracking-tight text-[#f0f0f0]">Welcome to SETLST</h1>
            <p className="text-[#a0a0a0] text-sm leading-relaxed max-w-xs">
              The home for everything you listen to. Track albums, grade them, and find your next favorite record.
            </p>
          </div>
        )}

        {/* ── 1. What it's for (album + grades + review) ── */}
        {step === 1 && (
          <div>
            <h2 className="font-serif text-2xl font-bold mb-1.5 tracking-tight text-[#f0f0f0]">Rate what you hear</h2>
            <p className="text-[#a0a0a0] text-sm mb-6">Give every album a grade from F to S and tell people why.</p>

            <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-2xl p-4">
              <div className="flex gap-3">
                {/* mock cover */}
                <div className="w-20 h-20 rounded-lg shrink-0 flex items-center justify-center bg-[#222222] border border-[#2e2e2e]">
                  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" className="text-[#c4a832]" stroke="currentColor" strokeWidth="1.4">
                    <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="3" /><circle cx="12" cy="12" r="0.6" fill="currentColor" />
                  </svg>
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold leading-snug text-[#f0f0f0]">Jane Doe</p>
                  <p className="text-xs text-[#a0a0a0]">Converge · 2001</p>
                  <p className="mt-1 text-[11px] font-bold text-[#c4a832]">S · Masterpiece</p>
                </div>
              </div>

              {/* grade scale — muted chips, S highlighted in the brand accent */}
              <div className="flex gap-1.5 mt-4">
                {GRADES.map((g) => {
                  const top = g.letter === "S";
                  return (
                    <div
                      key={g.letter}
                      className={`flex-1 h-9 rounded-md flex items-center justify-center text-sm font-bold border ${
                        top
                          ? "bg-[#c4a832] text-[#111111] border-[#c4a832]"
                          : "bg-[#222222] text-[#f0f0f0] border-[#2e2e2e]"
                      }`}
                    >
                      {g.letter}
                    </div>
                  );
                })}
              </div>

              {/* mock review */}
              <div className="mt-4 pt-3 border-t border-[#1f1f1f]">
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-5 h-5 rounded-full bg-[#222222] border border-[#2e2e2e] flex items-center justify-center text-[9px] text-[#c4a832]">JR</div>
                  <span className="text-xs text-[#a0a0a0]">jordan</span>
                </div>
                <p className="text-[13px] text-[#bbbbbb] leading-relaxed">
                  An absolute gut-punch from the first second to the last — relentless, raw, and somehow beautiful. I keep hitting replay.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── 2. Preferences ───────────────────────── */}
        {step === 2 && (
          <div>
            <h2 className="font-serif text-2xl font-bold mb-1.5 tracking-tight text-[#f0f0f0]">Pick your sound</h2>
            <p className="text-[#a0a0a0] text-sm mb-6">Choose a few genres so we can tune your recommendations.</p>
            <div className="flex flex-wrap gap-2">
              {GENRES.map((g) => {
                const on = prefs.has(g);
                return (
                  <button
                    key={g}
                    onClick={() => togglePref(g)}
                    className={`px-3.5 py-2 rounded-full text-sm transition-colors border ${
                      on ? "bg-[#c4a832] text-[#111111] border-[#c4a832]" : "bg-[#1a1a1a] text-[#a0a0a0] border-[#2e2e2e]"
                    }`}
                  >
                    {g}
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-[#6b6b6b] mt-4">{prefs.size} selected</p>
          </div>
        )}

        {/* ── 3. Location consent ──────────────────── */}
        {step === 3 && (
          <div className="flex flex-col items-center text-center pt-8">
            <div className="w-20 h-20 rounded-full bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-[#c4a832]" stroke="currentColor" strokeWidth="1.6">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-bold mb-2 tracking-tight text-[#f0f0f0]">Concerts near you</h2>
            <p className="text-[#a0a0a0] text-sm leading-relaxed max-w-xs mb-1">
              Share your location and we&apos;ll surface gigs and shows happening around you.
            </p>
            <p className="text-[11px] text-[#6b6b6b] max-w-xs">We never store or share your exact location.</p>
          </div>
        )}

        {/* ── 4. Connect contacts ──────────────────── */}
        {step === 4 && (
          <div className="flex flex-col items-center text-center pt-8">
            <div className="w-20 h-20 rounded-full bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center mb-6">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-[#c4a832]" stroke="currentColor" strokeWidth="1.6">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
            </div>
            <h2 className="font-serif text-2xl font-bold mb-2 tracking-tight text-[#f0f0f0]">Find your friends</h2>
            <p className="text-[#a0a0a0] text-sm leading-relaxed max-w-xs">
              See what the people you know are listening to — connect your contacts to get started.
            </p>
          </div>
        )}
      </div>

      {/* Side navigation arrows */}
      {step > 0 && (
        <button onClick={back} aria-label="Previous slide" className={`${sideArrow} left-2`}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        </button>
      )}
      <button onClick={next} aria-label="Next slide" className={`${sideArrow} right-2`}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
      </button>

      {/* footer: arrows + primary action */}
      <div className="px-6 pb-8 pt-2">
        <div className="flex items-center gap-3">
          <button onClick={back} disabled={step === 0} aria-label="Back" className={footArrow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
          </button>

          <div className="flex-1">
            {step === 3 ? (
              <button onClick={askLocation} disabled={locState === "asking"} className="w-full bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-60 text-[#111111] font-semibold py-3.5 rounded-xl transition-colors">
                {locState === "asking" ? "Requesting…" : "Allow location"}
              </button>
            ) : step === 4 ? (
              <button onClick={connectContacts} className="w-full bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111] font-semibold py-3.5 rounded-xl transition-colors">
                Connect contacts
              </button>
            ) : (
              <button onClick={next} className="w-full bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111] font-semibold py-3.5 rounded-xl transition-colors">
                {step === 0 ? "Get started" : step === 2 ? "Continue" : "Next"}
              </button>
            )}
          </div>

          <button onClick={next} aria-label="Next" className={footArrow}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </button>
        </div>

        {(step === 3 || step === 4) && (
          <button onClick={step === 3 ? next : finish} className="w-full text-sm text-[#6b6b6b] hover:text-[#f0f0f0] py-2 mt-2 transition-colors">
            {step === 3 ? "Not now" : "Maybe later"}
          </button>
        )}
      </div>
    </div>
  );
}
