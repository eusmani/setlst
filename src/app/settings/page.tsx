"use client";
import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import SpotifyConnect from "./SpotifyConnect";

type Theme = "mono" | "amber";

function applyTheme(t: Theme) {
  const c = document.documentElement.classList;
  c.remove("theme-mono", "theme-amber");
  c.add(`theme-${t}`);
}

// Light theme logo — an outlined sun with rays and a little cloud beside it
// (same hollow line style as the moon mark).
function SunRays() {
  return (
    <svg width="44" height="30" viewBox="0 0 38 26" fill="none">
      <g stroke="#f0f0f0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {/* sun (hollow), upper-left */}
        <circle cx="12" cy="10" r="4" />
        {/* rays */}
        <line x1="12" y1="4" x2="12" y2="1.2" />
        <line x1="6" y1="10" x2="3.2" y2="10" />
        <line x1="16.24" y1="5.76" x2="18.22" y2="3.78" />
        <line x1="7.76" y1="5.76" x2="5.78" y2="3.78" />
        {/* little cloud, lower-right */}
        <path d="M18 21h11a3.6 3.6 0 0 0 .2-7.2 4.9 4.9 0 0 0-9.2-1.4A3.3 3.3 0 0 0 18 21z" />
      </g>
    </svg>
  );
}

// 4-point sparkle with long, thin concave points, centered at (cx, cy), reach s.
function sparkle(cx: number, cy: number, s: number) {
  const i = s * 0.14; // inner pinch — smaller = thinner, sharper points
  return (
    `M${cx},${cy - s}` +
    `C${cx + i},${cy - i} ${cx + i},${cy - i} ${cx + s},${cy}` +
    `C${cx + i},${cy + i} ${cx + i},${cy + i} ${cx},${cy + s}` +
    `C${cx - i},${cy + i} ${cx - i},${cy + i} ${cx - s},${cy}` +
    `C${cx - i},${cy - i} ${cx - i},${cy - i} ${cx},${cy - s}Z`
  );
}

// Dark theme logo — an outlined crescent moon opening upper-right, with sparkles.
function MoonStars() {
  return (
    <svg width="44" height="30" viewBox="0 0 38 26" fill="none">
      {/* outlined crescent (Feather-style), opening to the upper-right */}
      <g transform="translate(0,2)">
        <path
          d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"
          stroke="#f0f0f0"
          strokeWidth="1.8"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </g>
      {/* sparkles */}
      <g fill="#f0f0f0">
        <path d={sparkle(25, 8, 3)} />
        <path d={sparkle(32, 13, 3.9)} />
        <path d={sparkle(28, 16.5, 1.4)} />
      </g>
    </svg>
  );
}

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${on ? "bg-[#c4a832]" : "bg-[#2e2e2e]"}`}
      aria-pressed={on}
    >
      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white transition-transform ${on ? "translate-x-5" : ""}`} />
    </button>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const [theme, setTheme] = useState<Theme>("amber");
  const [notif, setNotif] = useState({ newFollowers: true, friendReviews: true, newReleases: true, likes: false });
  const [privacy, setPrivacy] = useState({ privateProfile: false, hideActivity: false, hideSongPicks: false });
  const [blocked, setBlocked] = useState<string[]>([]);
  const [blockInput, setBlockInput] = useState("");
  const [tab, setTab] = useState<"general" | "account">("general");

  // load
  useEffect(() => {
    try {
      // Reflect the theme actually applied to <html> (set from the cookie by the server/head script).
      setTheme(document.documentElement.classList.contains("theme-mono") ? "mono" : "amber");
      const n = localStorage.getItem("setlst-notif"); if (n) setNotif(JSON.parse(n));
      const p = localStorage.getItem("setlst-privacy"); if (p) setPrivacy(JSON.parse(p));
      const b = localStorage.getItem("setlst-blocked"); if (b) setBlocked(JSON.parse(b));
    } catch {}
    // Source of truth for the private account flag is the server.
    fetch("/api/user/privacy")
      .then((r) => r.json())
      .then((d) => { if (typeof d.isPrivate === "boolean") setPrivacy((prev) => ({ ...prev, privateProfile: d.isPrivate })); })
      .catch(() => {});
  }, []);

  function chooseTheme(t: Theme) {
    setTheme(t);
    applyTheme(t);
    localStorage.setItem("setlst-theme", t);
    // Cookie is the source of truth the server reads, so navigation keeps the theme.
    document.cookie = `setlst-theme=${t}; path=/; max-age=31536000; samesite=lax`;
  }
  function toggleNotif(k: keyof typeof notif) {
    const next = { ...notif, [k]: !notif[k] };
    setNotif(next); localStorage.setItem("setlst-notif", JSON.stringify(next));
  }
  function togglePrivacy(k: keyof typeof privacy) {
    const next = { ...privacy, [k]: !privacy[k] };
    setPrivacy(next); localStorage.setItem("setlst-privacy", JSON.stringify(next));
    // Private account is a real server setting (gates content + enables follow requests).
    if (k === "privateProfile") {
      fetch("/api/user/privacy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPrivate: next.privateProfile }),
      }).catch(() => {});
    }
  }
  function addBlock() {
    const u = blockInput.trim().replace(/^@/, "");
    if (!u || blocked.includes(u)) { setBlockInput(""); return; }
    const next = [...blocked, u];
    setBlocked(next); localStorage.setItem("setlst-blocked", JSON.stringify(next));
    setBlockInput("");
  }
  function removeBlock(u: string) {
    const next = blocked.filter((x) => x !== u);
    setBlocked(next); localStorage.setItem("setlst-blocked", JSON.stringify(next));
  }
  if (status !== "loading" && !session) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <p className="text-[#a0a0a0] text-sm">
          <Link href="/login" className="text-[#c4a832] hover:underline">Sign in</Link> to access settings.
        </p>
      </div>
    );
  }

  const card = "bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-5 mb-6";
  const row = "flex items-center justify-between gap-4 py-2.5";

  return (
    <div className="max-w-2xl mx-auto px-5 py-12">
      <h1 className="font-serif text-3xl text-[#f0f0f0] mb-6">Settings</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1f1f1f] mb-6">
        {([
          { k: "general", label: "General" },
          { k: "account", label: "Account" },
        ] as const).map(({ k, label }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm -mb-px border-b-2 transition-colors ${
              tab === k
                ? "border-[#c4a832] text-[#f0f0f0]"
                : "border-transparent text-[#6b6b6b] hover:text-[#a0a0a0]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "general" && (<>
      {/* Theme */}
      <div className={card}>
        <h2 className="text-xs text-[#a0a0a0] uppercase tracking-[0.15em] mb-4">Theme</h2>
        <div className="grid grid-cols-2 gap-3">
          {([
            { key: "mono", label: "Light theme", swatch: ["#f3ecdb", "#1c160c"], icon: "sun" },
            { key: "amber", label: "Dark theme", swatch: ["#111111", "#c4a832"], icon: "moon" },
          ] as const).map(({ key, label, swatch, icon }) => (
            <button
              key={key}
              onClick={() => chooseTheme(key)}
              aria-label={label}
              title={label}
              className={`rounded-lg border p-4 text-left transition-colors ${
                theme === key ? "border-[#c4a832] bg-[#222222]" : "border-[#2e2e2e] hover:border-[#555]"
              }`}
            >
              <div className="flex gap-1.5 mb-2.5">
                {swatch.map((c) => <span key={c} className="w-6 h-6 rounded-full border border-[#333]" style={{ background: c }} />)}
              </div>
              {icon === "sun" ? <SunRays /> : <MoonStars />}
              {theme === key && <p className="text-[10px] text-[#c4a832] mt-1">Active</p>}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications */}
      <div className={card}>
        <h2 className="text-xs text-[#a0a0a0] uppercase tracking-[0.15em] mb-3">Notifications</h2>
        {([
          { k: "newFollowers", label: "New followers" },
          { k: "friendReviews", label: "When friends post reviews" },
          { k: "newReleases", label: "New releases from artists you follow" },
          { k: "likes", label: "Likes on your reviews" },
        ] as const).map(({ k, label }) => (
          <div key={k} className={row}>
            <span className="text-sm text-[#d8d8d8]">{label}</span>
            <Toggle on={notif[k]} onClick={() => toggleNotif(k)} />
          </div>
        ))}
      </div>

      </>)}

      {tab === "account" && (<>
      <SpotifyConnect />
      {/* Privacy */}
      <div className={card}>
        <h2 className="text-xs text-[#a0a0a0] uppercase tracking-[0.15em] mb-3">Privacy</h2>
        {([
          { k: "privateProfile", label: "Private profile (only followers can see your activity)" },
          { k: "hideActivity", label: "Hide my listening activity" },
          { k: "hideSongPicks", label: "Hide my favorite/least-favorite songs" },
        ] as const).map(({ k, label }) => (
          <div key={k} className={row}>
            <span className="text-sm text-[#d8d8d8]">{label}</span>
            <Toggle on={privacy[k]} onClick={() => togglePrivacy(k)} />
          </div>
        ))}
      </div>

      {/* Block list */}
      <div className={card}>
        <h2 className="text-xs text-[#a0a0a0] uppercase tracking-[0.15em] mb-3">Block list</h2>
        <p className="text-xs text-[#6b6b6b] mb-3">Blocked members are hidden from your feed and members list.</p>
        <div className="flex gap-2 mb-3">
          <input
            value={blockInput}
            onChange={(e) => setBlockInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addBlock()}
            placeholder="username to block…"
            className="flex-1 bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b]"
          />
          <button onClick={addBlock} className="bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111] px-4 py-2 rounded-lg text-sm transition-colors">
            Block
          </button>
        </div>
        {blocked.length === 0 ? (
          <p className="text-xs text-[#6b6b6b]">No blocked members.</p>
        ) : (
          <div className="space-y-1.5">
            {blocked.map((u) => (
              <div key={u} className="flex items-center justify-between bg-[#222222] rounded-lg px-3 py-2">
                <span className="text-sm text-[#d8d8d8]">{u}</span>
                <button onClick={() => removeBlock(u)} className="text-xs text-[#6b6b6b] hover:text-red-400 transition-colors">Unblock</button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Account management — delete lives on its own page so it's not one tap away */}
      <div className="mt-2 mb-6">
        <Link href="/settings/delete" className="text-xs text-[#6b6b6b] hover:text-red-400 transition-colors">
          Delete account →
        </Link>
      </div>
      </>)}
    </div>
  );
}
