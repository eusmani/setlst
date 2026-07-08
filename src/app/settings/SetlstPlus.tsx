"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { purchasePlus, restorePurchases } from "@/lib/purchases";

interface Status { premium: boolean; plan: string | null; until: string | null; appUserId: string | null }

const PERKS = [
  "Ad-free experience",
  "Review analytics",
  "Monthly recaps",
  "Filter music by your streaming services",
  "Custom app icons",
  "Multiple photos per review",
];

export default function SetlstPlus() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    fetch("/api/premium/status").then((r) => r.json()).then(setStatus).catch(() => setStatus({ premium: false, plan: null, until: null, appUserId: null }));
  }, []);

  async function subscribe() {
    if (!status?.appUserId) return;
    setBusy(true); setMsg("");
    const res = await purchasePlus(status.appUserId);
    setMsg(res.message);
    if (res.ok) fetch("/api/premium/status").then((r) => r.json()).then(setStatus).catch(() => {});
    setBusy(false);
  }

  async function restore() {
    if (!status?.appUserId) return;
    setBusy(true); setMsg("");
    const ok = await restorePurchases(status.appUserId);
    setMsg(ok ? "Purchases restored." : "Nothing to restore.");
    if (ok) fetch("/api/premium/status").then((r) => r.json()).then(setStatus).catch(() => {});
    setBusy(false);
  }

  if (!status) return null;

  return (
    <div className="rounded-xl p-5 mb-5 border border-[#c4a832]/40 bg-gradient-to-br from-[#c4a832]/12 to-[#1a1a1a]">
      <div className="flex items-center gap-2 mb-1">
        <img src="/turntable-logo.png" alt="" className="w-5 h-5 object-contain shrink-0" />
        <h2 className="text-sm text-[#f0f0f0] font-semibold">SETLST Pro</h2>
        {status.premium && <span className="text-[10px] uppercase tracking-wide bg-[#c4a832] text-black rounded-full px-2 py-0.5 font-bold">Active</span>}
      </div>

      {status.premium ? (
        <>
          <p className="text-xs text-[#a0a0a0] mb-3">
            You’re a Pro member{status.until ? ` · renews ${new Date(status.until).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}` : ""}. Thanks for supporting SETLST 💛
          </p>
          <Link href="/analytics" className="inline-flex items-center gap-1.5 text-xs text-[#c4a832] border border-[#c4a832]/50 hover:border-[#c4a832] rounded-full px-3 py-1.5 transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 3v18h18" /><path d="M7 14l4-4 3 3 5-6" /></svg>
            View your review analytics
          </Link>
        </>
      ) : (
        <>
          <p className="text-xs text-[#a0a0a0] mb-3">Support SETLST and unlock extras.</p>
          <ul className="space-y-1.5 mb-4">
            {PERKS.map((p) => (
              <li key={p} className="flex items-center gap-2 text-sm text-[#d8d8d8]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#c4a832" strokeWidth="2.5" className="shrink-0"><polyline points="20 6 9 17 4 12" /></svg>
                {p}
              </li>
            ))}
          </ul>
          <div className="flex items-center gap-3">
            <button onClick={subscribe} disabled={busy}
              className="bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#141414] text-sm font-semibold px-4 py-2 rounded-lg transition-colors">
              {busy ? "…" : "Subscribe"}
            </button>
            <button onClick={restore} disabled={busy} className="text-xs text-[#a0a0a0] hover:text-[#c4a832] transition-colors">Restore purchases</button>
          </div>
        </>
      )}
      {msg && <p className="text-xs text-[#c4a832] mt-3">{msg}</p>}
    </div>
  );
}
