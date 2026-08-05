"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

// Tells a suspended member what happened and how to appeal, instead of leaving
// them to discover it by having every post silently fail. Suspended accounts
// keep read access and can still export or delete their data.
export default function SuspensionBanner() {
  const { data: session } = useSession();
  const [reason, setReason] = useState<string | null>(null);

  useEffect(() => {
    if (!session) { setReason(null); return; }
    fetch("/api/me")
      .then((r) => r.json())
      .then((d) => setReason(d?.suspended ? (d.suspendedReason ?? "Your account is suspended.") : null))
      .catch(() => {});
  }, [session]);

  if (!reason) return null;

  return (
    <div className="bg-red-950/40 border-b border-red-900/40 px-4 py-2.5">
      <p className="max-w-2xl mx-auto text-xs text-red-300 leading-relaxed text-center">
        {reason}{" "}
        <a href="mailto:support@setlst.dev" className="underline underline-offset-2">
          Contact support
        </a>
        .
      </p>
    </div>
  );
}
