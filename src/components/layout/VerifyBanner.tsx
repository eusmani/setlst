"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function VerifyBanner() {
  const { status } = useSession();
  const [verified, setVerified] = useState<boolean | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") { setVerified(true); return; }
    fetch("/api/user/verification-status")
      .then((r) => r.json())
      .then((d) => setVerified(!!d.verified))
      .catch(() => setVerified(true));
  }, [status]);

  async function resend() {
    setSending(true);
    try {
      const r = await fetch("/api/auth/resend-verification", { method: "POST" });
      if (r.ok) setSent(true);
    } catch {} finally { setSending(false); }
  }

  if (verified !== false || dismissed) return null;

  return (
    <div className="relative bg-[#c4a832] text-[#111111]">
      <div className="max-w-6xl mx-auto px-5 py-2 flex items-center gap-3 text-sm">
        <span className="flex-1">
          {sent
            ? "Verification email sent — check your inbox."
            : "Verify your email to secure your account."}
        </span>
        {!sent && (
          <button onClick={resend} disabled={sending} className="font-semibold underline disabled:opacity-60 shrink-0">
            {sending ? "Sending…" : "Resend email"}
          </button>
        )}
        <button onClick={() => setDismissed(true)} aria-label="Dismiss" className="shrink-0 hover:opacity-70">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="1" y1="1" x2="11" y2="11" /><line x1="11" y1="1" x2="1" y2="11" />
          </svg>
        </button>
      </div>
    </div>
  );
}
