"use client";
import { useEffect, useState } from "react";
import Portal from "@/components/ui/Portal";
import { tapHaptic } from "@/lib/native";
import { REPORT_REASONS, type ReportableType } from "@/lib/reportTypes";

interface Props {
  contentType: ReportableType;
  /** Id of the reported item — the username when contentType is "user". */
  contentId: string;
  /** Shown in the header, e.g. "@marla's review". */
  label: string;
  onClose: () => void;
}

// The report sheet (App Store guideline 1.2). Reachable from every piece of
// user-generated content in the app: reviews, comments, discussions, replies,
// direct messages, and profiles.
export default function ReportDialog({ contentType, contentId, label, onClose }: Props) {
  const [reason, setReason] = useState<string>("");
  const [details, setDetails] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    if (!reason) { setError("Pick a reason so we know what to look for."); return; }
    setState("sending"); setError("");
    tapHaptic();
    try {
      const res = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentType, contentId, reason, details }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error ?? "Couldn't send that report. Try again.");
        setState("idle");
        return;
      }
      setState("sent");
    } catch {
      setError("Couldn't send that report. Check your connection and try again.");
      setState("idle");
    }
  }

  return (
    <Portal>
      <div
        className="fixed inset-0 z-[100] bg-black/70 flex items-end sm:items-center justify-center"
        onClick={onClose}
      >
        <div
          className="w-full sm:max-w-md bg-[#1a1a1a] border border-[#2e2e2e] rounded-t-2xl sm:rounded-2xl p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          onClick={(e) => e.stopPropagation()}
        >
          {state === "sent" ? (
            <div className="text-center py-4">
              <p className="text-[#f0f0f0] mb-2">Report received</p>
              <p className="text-sm text-[#a0a0a0] leading-relaxed mb-5">
                Our team reviews every report within 24 hours and removes content that breaks
                our rules. You can also block this person so you stop seeing them entirely.
              </p>
              <button
                onClick={onClose}
                className="w-full bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111] py-2.5 rounded-lg text-sm transition-colors"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <h2 className="text-[#f0f0f0] mb-1">Report {label}</h2>
              <p className="text-xs text-[#6b6b6b] mb-4 leading-relaxed">
                SETLST has zero tolerance for objectionable content. Reports are reviewed within
                24 hours and offending content and accounts are removed.
              </p>

              <div className="space-y-1.5 mb-4 max-h-[45vh] overflow-y-auto">
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r.value}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                      reason === r.value
                        ? "border-[#c4a832] bg-[#c4a832]/10"
                        : "border-[#2e2e2e] hover:border-[#555]"
                    }`}
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r.value}
                      checked={reason === r.value}
                      onChange={() => setReason(r.value)}
                      className="w-4 h-4 accent-[#c4a832]"
                    />
                    <span className="text-sm text-[#d8d8d8]">{r.label}</span>
                  </label>
                ))}
              </div>

              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value.slice(0, 1000))}
                placeholder="Anything else we should know? (optional)"
                rows={3}
                className="w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] mb-3 resize-none"
              />

              {error && <p className="text-red-400 text-xs mb-3">{error}</p>}

              <div className="flex gap-2">
                <button
                  onClick={submit}
                  disabled={state === "sending"}
                  className="flex-1 bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111] py-2.5 rounded-lg text-sm transition-colors"
                >
                  {state === "sending" ? "Sending…" : "Submit report"}
                </button>
                <button
                  onClick={onClose}
                  className="px-4 border border-[#2e2e2e] hover:border-[#555] text-[#a0a0a0] rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </Portal>
  );
}
