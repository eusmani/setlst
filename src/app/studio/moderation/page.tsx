"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { REPORT_REASONS, MODERATION_SLA_HOURS } from "@/lib/reportTypes";

interface Report {
  id: string;
  createdAt: string;
  contentType: string;
  contentId: string;
  reason: string;
  details: string | null;
  snapshot: string | null;
  status: string;
  reporter: string | null;
  reportedUser: { username: string; suspended: boolean } | null;
}

const REASON_LABEL = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label]));

// The moderation queue (App Store guideline 1.2). Reports are worked oldest
// first; the age badge turns red once something has been waiting longer than the
// 24-hour commitment in our Terms of Use.
export default function ModerationPage() {
  const [reports, setReports] = useState<Report[] | null>(null);
  const [tab, setTab] = useState<"pending" | "all">("pending");
  const [busy, setBusy] = useState<string | null>(null);
  const [denied, setDenied] = useState(false);
  // Ages are computed against a clock held in state rather than Date.now() at
  // render time, so rendering stays pure and the badges tick on their own.
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/moderation?status=${tab}`);
      if (res.status === 403) { setDenied(true); setReports([]); return; }
      const d = await res.json();
      setReports(d.reports ?? []);
    } catch {
      setReports([]);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  async function act(reportId: string, action: "remove" | "suspend" | "dismiss") {
    setBusy(reportId);
    try {
      const res = await fetch("/api/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportId, action }),
      });
      if (res.ok) await load();
    } finally {
      setBusy(null);
    }
  }

  if (denied) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <p className="text-sm text-[#a0a0a0]">This page is for SETLST moderators.</p>
        <Link href="/" className="text-sm text-[#c4a832] hover:underline mt-2 inline-block">← Home</Link>
      </div>
    );
  }

  const overdue = (createdAt: string, status: string) =>
    status === "pending" &&
    now - new Date(createdAt).getTime() > MODERATION_SLA_HOURS * 60 * 60 * 1000;

  const age = (createdAt: string) => {
    const mins = Math.floor((now - new Date(createdAt).getTime()) / 60000);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    return hours < 48 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
  };

  return (
    <div className="max-w-3xl mx-auto px-5 pt-6 pb-16">
      <Link href="/studio" className="text-sm text-[#6b6b6b] hover:text-[#c4a832] transition-colors">← Studio</Link>
      <h1 className="font-serif text-3xl text-[#f0f0f0] mt-3 mb-1">Moderation queue</h1>
      <p className="text-xs text-[#6b6b6b] mb-6">
        Reported content, oldest first. Everything here is actioned within {MODERATION_SLA_HOURS} hours.
      </p>

      <div className="flex gap-1 border-b border-[#1f1f1f] mb-5">
        {(["pending", "all"] as const).map((k) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-2 text-sm capitalize transition-colors border-b-2 -mb-px ${
              tab === k ? "border-[#c4a832] text-[#f0f0f0]" : "border-transparent text-[#6b6b6b] hover:text-[#a0a0a0]"
            }`}
          >
            {k}
          </button>
        ))}
      </div>

      {reports === null ? (
        <p className="text-sm text-[#6b6b6b]">Loading…</p>
      ) : reports.length === 0 ? (
        <p className="text-sm text-[#6b6b6b]">
          {tab === "pending" ? "Nothing waiting. The queue is clear." : "No reports yet."}
        </p>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-4">
              <div className="flex items-center gap-2 flex-wrap mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[#6b6b6b] border border-[#2e2e2e] rounded-full px-2 py-0.5">
                  {r.contentType}
                </span>
                <span className="text-sm text-[#f0f0f0]">{REASON_LABEL[r.reason] ?? r.reason}</span>
                <span
                  className={`text-[11px] ml-auto ${overdue(r.createdAt, r.status) ? "text-red-400" : "text-[#6b6b6b]"}`}
                  title={new Date(r.createdAt).toLocaleString()}
                >
                  {age(r.createdAt)}
                  {overdue(r.createdAt, r.status) && " · overdue"}
                </span>
              </div>

              <p className="text-xs text-[#6b6b6b] mb-2">
                reported by {r.reporter ? `@${r.reporter}` : "a since-deleted account"}
                {r.reportedUser && (
                  <>
                    {" · author "}
                    <Link href={`/profile/${r.reportedUser.username}`} className="text-[#a0a0a0] hover:text-[#c4a832]">
                      @{r.reportedUser.username}
                    </Link>
                    {r.reportedUser.suspended && <span className="text-red-400"> (suspended)</span>}
                  </>
                )}
              </p>

              {r.snapshot && (
                <pre className="text-xs text-[#c8c8c8] bg-[#141414] border border-[#1f1f1f] rounded-lg p-3 mb-2 whitespace-pre-wrap break-words max-h-48 overflow-y-auto font-sans">
                  {r.snapshot}
                </pre>
              )}
              {r.details && <p className="text-xs text-[#a0a0a0] italic mb-2">“{r.details}”</p>}

              {r.status === "pending" ? (
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => act(r.id, "remove")}
                    disabled={busy === r.id}
                    className="bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111] text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Remove content
                  </button>
                  <button
                    onClick={() => act(r.id, "suspend")}
                    disabled={busy === r.id}
                    className="bg-red-500 hover:bg-red-600 disabled:opacity-50 text-white text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    Remove + suspend author
                  </button>
                  <button
                    onClick={() => act(r.id, "dismiss")}
                    disabled={busy === r.id}
                    className="border border-[#2e2e2e] hover:border-[#555] disabled:opacity-50 text-[#a0a0a0] text-xs px-3 py-1.5 rounded-lg transition-colors"
                  >
                    No violation
                  </button>
                </div>
              ) : (
                <p className="text-xs text-[#6b6b6b]">Resolved — {r.status.replace("_", " ")}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
