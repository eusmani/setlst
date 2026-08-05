"use client";
import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";
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
    body: "Rate your favorites, write reviews, and build a diary based on your recent listening.",
  },
  {
    icon: <span className="text-8xl" aria-hidden>🔎</span>,
    title: "Discover your next favorite",
    body: "Track new releases, deep cuts from your favorite genres, and hidden gems based on what you listen to.",
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

// The 4 sign-up wizard steps shown after the intro slides.
const SIGNUP_STEPS = [
  { key: "name", title: "What's your name?", sub: "This is how you'll show up on SETLST." },
  { key: "login", title: "Pick a username & password", sub: "Your username is your handle. Password is 8+ characters." },
  // Optional: SETLST works fine without a number, so this step can be passed
  // through empty (App Store guideline 5.1.1 — don't require data you don't need).
  { key: "phone", title: "Your phone number", sub: "Optional — only used to help friends find you and to recover your account. You can skip this." },
  { key: "email", title: "Your email", sub: "We'll send a verification link to confirm it's you." },
] as const;

export default function OnboardingSlideshow() {
  const [show, setShow] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [i, setI] = useState(0);
  const [album, setAlbum] = useState<RandomAlbum | null>(null);
  const [discover, setDiscover] = useState<DiscoverAlbum[]>([]);
  const [concerts, setConcerts] = useState<OnbConcert[]>([]);
  const startX = useRef<number | null>(null);

  // After the intro slides: a 4-step sign-up wizard (name → username/password →
  // phone → email), or a sign-in form for returning users.
  const [mode, setMode] = useState<"slides" | "auth">("slides");
  const [authTab, setAuthTab] = useState<"signup" | "signin">("signup");
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: "", username: "", email: "", phone: "", password: "", identifier: "" });
  const [authError, setAuthError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [connectStep, setConnectStep] = useState(false);
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "invalid">("idle");
  const setField = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

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

  // Live username availability check (debounced) so a taken handle is caught on
  // the username step, not after the whole wizard. The server is still the
  // source of truth — register/profile enforce uniqueness regardless.
  useEffect(() => {
    const u = form.username.trim().toLowerCase();
    if (!u) { setUsernameStatus("idle"); return; }
    if (!/^[a-z0-9_]{3,20}$/.test(u)) { setUsernameStatus("invalid"); return; }
    setUsernameStatus("checking");
    const t = setTimeout(async () => {
      try {
        const r = await fetch(`/api/auth/username-available?u=${encodeURIComponent(u)}`);
        const d = await r.json();
        setUsernameStatus(d.available ? "available" : d.reason === "invalid" ? "invalid" : "taken");
      } catch { setUsernameStatus("idle"); }
    }, 400);
    return () => clearTimeout(t);
  }, [form.username]);

  if (!show) return null;

  const last = i === SLIDES.length - 1;
  const finish = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    setShow(false);
    // Drop the pre-hydration cover so the app underneath is revealed.
    try { document.documentElement.classList.remove("onb-pending"); } catch {}
    // Let NativeBridge request push permission now that onboarding is dismissed,
    // so the system dialog doesn't cover the welcome screen on first launch.
    try { window.dispatchEvent(new Event("setlst:onboarded")); } catch {}
  };
  // Last slide's CTA opens the sign-up wizard instead of dismissing onboarding.
  const next = () => {
    if (last) { setMode("auth"); setAuthTab("signup"); setStep(0); setAuthError(""); }
    else setI((n) => n + 1);
  };

  const prev = () => setI((n) => Math.max(0, n - 1));

  // After a successful sign-up / sign-in: mark onboarding done and hard-reload
  // to "/" so the new session cookie takes effect app-wide (and NativeBridge
  // requests push now that the seen-flag is set).
  const completeAuth = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    window.location.assign("/");
  };

  // Mark onboarding done, then hand off to Spotify's OAuth (a full-page redirect
  // that comes back via /api/spotify/callback → /settings). Setting the flag
  // first means onboarding won't re-appear after the round-trip.
  const connectSpotify = () => {
    try { localStorage.setItem(SEEN_KEY, "1"); } catch {}
    try { document.documentElement.classList.remove("onb-pending"); } catch {}
    window.location.assign("/api/spotify/connect");
  };

  // Validate just the field(s) collected on the current wizard step. Returns an
  // error message, or null when the step is good to advance.
  const validateStep = (idx: number): string | null => {
    const key = SIGNUP_STEPS[idx].key;
    if (key === "name" && !form.name.trim()) return "Enter your name";
    if (key === "login") {
      if (!/^[a-z0-9_]{3,20}$/.test(form.username)) return "Username: 3–20 lowercase letters, numbers or underscores";
      if (usernameStatus === "taken") return "That username is already taken";
      if (form.password.length < 8) return "Password must be at least 8 characters";
    }
    // No check for "phone": it's optional and may be left blank.
    if (key === "email") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return "Enter a valid email";
      // The EULA is accepted on the final step, immediately before the account
      // is created (App Store guideline 1.2).
      if (!acceptedTerms) return "Please accept the Terms of Use and Privacy Policy to continue";
    }
    return null;
  };

  // Create the account and sign in (called after the final wizard step).
  const doRegister = async () => {
    setSubmitting(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          username: form.username,
          email: form.email,
          phone: form.phone,
          password: form.password,
          acceptedTerms,
        }),
      });
      if (!res.ok) {
        setAuthError((await res.json().catch(() => ({})))?.error ?? "Registration failed");
        setSubmitting(false);
        return;
      }
      const r = await signIn("credentials", { identifier: form.email, password: form.password, redirect: false });
      if (r?.error) {
        setAuthError("Account created. Please sign in.");
        setAuthTab("signin");
        setForm((f) => ({ ...f, identifier: f.email }));
        setSubmitting(false);
        return;
      }
      // Signed in — offer to connect a music service before entering the app.
      setSubmitting(false);
      setConnectStep(true);
    } catch {
      setAuthError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  };

  // Continue button on a wizard step: validate, then advance or (on the last
  // step) submit.
  const advanceSignup = (e: React.FormEvent) => {
    e.preventDefault();
    const err = validateStep(step);
    if (err) { setAuthError(err); return; }
    setAuthError("");
    if (step < SIGNUP_STEPS.length - 1) setStep((n) => n + 1);
    else void doRegister();
  };

  const submitSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setSubmitting(true);
    try {
      const r = await signIn("credentials", { identifier: form.identifier, password: form.password, redirect: false });
      if (r?.error) { setAuthError("Invalid login or password"); setSubmitting(false); return; }
      completeAuth();
    } catch {
      setAuthError("Something went wrong. Try again.");
      setSubmitting(false);
    }
  };

  // Back button in the auth flow: previous wizard step, or out to the slides.
  const authBack = () => {
    setAuthError("");
    if (authTab === "signup" && step > 0) setStep((n) => n - 1);
    else setMode("slides");
  };

  const onTouchStart = (e: React.TouchEvent) => {
    if (mode !== "slides") return;
    startX.current = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (mode !== "slides") return;
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

  const inputClass =
    "w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-3 text-[15px] focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] transition-colors";

  const cur = SIGNUP_STEPS[step];
  const lastStep = step === SIGNUP_STEPS.length - 1;

  // The final onboarding stretch: a 4-step sign-up wizard, or a sign-in form.
  const authPanel = (
    <div className="flex flex-1 flex-col overflow-y-auto px-6 pb-8 pt-3">
      {/* Back / Skip — hidden on the post-sign-up connect step (account exists). */}
      {!connectStep && (
        <div className="flex items-center justify-between">
          <button onClick={authBack} className="-ml-1 px-2 py-1.5 text-sm text-[#8a8a8a] transition-colors hover:text-[#c4a832]">
            ← Back
          </button>
          <button onClick={finish} className="px-2 py-1.5 text-sm text-[#8a8a8a] transition-colors hover:text-[#c4a832]">
            Skip
          </button>
        </div>
      )}

      {connectStep ? (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <img src="/turntable-logo.png" alt="" className="mx-auto mb-6 h-14 w-14 object-contain" />
          <div className="mb-6 text-center">
            <h1 className="font-serif text-3xl leading-tight tracking-tight">Connect your music</h1>
            <p className="mt-1.5 text-sm text-[#a0a0a0]">
              Link a music service so SETLST can tailor recommendations and search to your listening history.
            </p>
          </div>

          <div className="space-y-3">
            <button
              onClick={connectSpotify}
              className="flex w-full items-center justify-center gap-2.5 rounded-2xl bg-[#1DB954] py-3.5 font-bold tracking-wide text-black transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" /></svg>
              Connect Spotify
            </button>

            <button
              disabled
              className="relative flex w-full cursor-not-allowed items-center justify-center gap-2.5 rounded-2xl border border-[#2e2e2e] bg-[#1a1a1a] py-3.5 font-bold tracking-wide text-[#8a8a8a]"
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden><path d="M12 2c-5.52 0-10 4.48-10 10s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm3.66 5.02c.18 0 .28.11.28.32v6.35c0 .78-.13 1.29-.5 1.7-.4.44-.98.62-1.55.62-.98 0-1.7-.62-1.7-1.5 0-.86.72-1.48 1.78-1.55.35-.02.68.02.95.11V9.15l-4.5.92v5.28c0 .8-.13 1.3-.5 1.71-.4.44-.98.62-1.56.62-.97 0-1.69-.62-1.69-1.5 0-.86.72-1.49 1.78-1.55.34-.02.67.02.94.1V8.28c0-.4.2-.6.6-.68l5.2-1.06c.06-.01.11-.02.15-.02z" /></svg>
              Apple Music
              <span className="ml-1 rounded-full bg-[#2a2a2a] px-2 py-0.5 text-[10px] font-medium text-[#a0a0a0]">Coming soon</span>
            </button>
          </div>

          <button onClick={completeAuth} className="mx-auto mt-6 px-3 py-2 text-sm text-[#8a8a8a] transition-colors hover:text-[#c4a832]">
            Maybe later
          </button>
        </div>
      ) : authTab === "signup" ? (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <img src="/turntable-logo.png" alt="" className="mx-auto mb-6 h-14 w-14 object-contain" />

          {/* Step progress */}
          <div className="mb-6 flex justify-center gap-2">
            {SIGNUP_STEPS.map((_, idx) => (
              <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 ${idx === step ? "w-8 bg-[#c4a832]" : idx < step ? "w-4 bg-[#c4a832]/50" : "w-4 bg-[#3a3a3a]"}`} />
            ))}
          </div>

          <div className="mb-5 text-center">
            <h1 className="font-serif text-3xl leading-tight tracking-tight">{cur.title}</h1>
            <p className="mt-1.5 text-sm text-[#a0a0a0]">{cur.sub}</p>
          </div>

          <form onSubmit={advanceSignup} className="space-y-3">
            {authError && (
              <p className="rounded-lg border border-red-900/30 bg-red-950/30 px-3 py-2 text-sm text-red-400">{authError}</p>
            )}

            {cur.key === "name" && (
              <input autoFocus className={inputClass} type="text" value={form.name} onChange={(e) => setField("name")(e.target.value)} autoCapitalize="words" placeholder="Your name" />
            )}
            {cur.key === "login" && (
              <>
                <div>
                  <input autoFocus className={inputClass} type="text" value={form.username} onChange={(e) => setField("username")(e.target.value.toLowerCase())} minLength={3} maxLength={20} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Username" />
                  {usernameStatus === "checking" && <p className="mt-1.5 px-1 text-xs text-[#8a8a8a]">Checking availability…</p>}
                  {usernameStatus === "available" && <p className="mt-1.5 px-1 text-xs text-[#6fbf73]">✓ Available</p>}
                  {usernameStatus === "taken" && <p className="mt-1.5 px-1 text-xs text-red-400">That username is already taken</p>}
                  {usernameStatus === "invalid" && form.username.length > 0 && <p className="mt-1.5 px-1 text-xs text-[#8a8a8a]">3–20 lowercase letters, numbers or underscores</p>}
                </div>
                <input className={inputClass} type="password" value={form.password} onChange={(e) => setField("password")(e.target.value)} minLength={8} placeholder="Password (min 8 characters)" />
              </>
            )}
            {cur.key === "phone" && (
              <>
                <input autoFocus className={inputClass} type="tel" value={form.phone} onChange={(e) => setField("phone")(e.target.value)} placeholder="(555) 123-4567 — optional" />
                <button type="button" onClick={() => { setAuthError(""); setStep((n) => n + 1); }} className="w-full py-2 text-sm text-[#8a8a8a] transition-colors hover:text-[#c4a832]">
                  Skip for now
                </button>
              </>
            )}
            {cur.key === "email" && (
              <>
                <input autoFocus className={inputClass} type="email" value={form.email} onChange={(e) => setField("email")(e.target.value)} autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="you@example.com" />
                {/* Guideline 1.2: explicit agreement before an account that can
                    post user-generated content exists. */}
                <label className="flex cursor-pointer items-start gap-2.5 pt-1">
                  <input
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#c4a832]"
                  />
                  <span className="text-xs leading-relaxed text-[#a0a0a0]">
                    I agree to the{" "}
                    <a href="/terms" target="_blank" rel="noopener noreferrer" className="text-[#c4a832] underline">Terms of Use</a>{" "}
                    and{" "}
                    <a href="/privacy" target="_blank" rel="noopener noreferrer" className="text-[#c4a832] underline">Privacy Policy</a>.
                    SETLST has zero tolerance for objectionable content or abusive behaviour.
                  </span>
                </label>
              </>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-gradient-to-b from-[#d4ba44] to-[#c4a832] py-3.5 font-bold tracking-wide text-[#1a1408] shadow-lg shadow-[#c4a832]/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Creating account…" : lastStep ? "Create account" : "Continue"}
            </button>
          </form>

          {step === 0 && (
            <p className="mt-5 text-center text-sm text-[#a0a0a0]">
              Already have an account?{" "}
              <button onClick={() => { setAuthTab("signin"); setAuthError(""); }} className="text-[#c4a832] hover:underline">Sign in</button>
            </p>
          )}
        </div>
      ) : (
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center">
          <img src="/turntable-logo.png" alt="" className="mx-auto mb-6 h-14 w-14 object-contain" />
          <div className="mb-5 text-center">
            <h1 className="font-serif text-3xl tracking-tight">Welcome back</h1>
            <p className="mt-1.5 text-sm text-[#a0a0a0]">Sign in to pick up where you left off.</p>
          </div>
          <form onSubmit={submitSignin} className="space-y-3">
            {authError && (
              <p className="rounded-lg border border-red-900/30 bg-red-950/30 px-3 py-2 text-sm text-red-400">{authError}</p>
            )}
            <input className={inputClass} type="text" value={form.identifier} onChange={(e) => setField("identifier")(e.target.value)} required autoCapitalize="none" autoCorrect="off" spellCheck={false} placeholder="Email or username" />
            <input className={inputClass} type="password" value={form.password} onChange={(e) => setField("password")(e.target.value)} required placeholder="Password" />
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-2xl bg-gradient-to-b from-[#d4ba44] to-[#c4a832] py-3.5 font-bold tracking-wide text-[#1a1408] shadow-lg shadow-[#c4a832]/20 transition-all hover:brightness-110 active:scale-[0.98] disabled:opacity-50"
            >
              {submitting ? "Signing in…" : "Sign in"}
            </button>
          </form>
          <p className="mt-5 text-center text-sm text-[#a0a0a0]">
            New here?{" "}
            <button onClick={() => { setAuthTab("signup"); setStep(0); setAuthError(""); }} className="text-[#c4a832] hover:underline">Create an account</button>
          </p>
        </div>
      )}
    </div>
  );

  return (
    <div
      className="onb-overlay fixed inset-0 z-[100] flex flex-col text-[#f0f0f0] pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {mode === "auth" ? authPanel : (
      <>
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
      </>
      )}
    </div>
  );
}
