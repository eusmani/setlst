"use client";
import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function VerifyInner() {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    if (!token) { setStatus("error"); return; }
    fetch("/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then((r) => setStatus(r.ok ? "ok" : "error"))
      .catch(() => setStatus("error"));
  }, [token]);

  return (
    <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-6 text-center">
      {status === "loading" && <p className="text-sm text-[#a0a0a0]">Verifying your email…</p>}
      {status === "ok" && (
        <>
          <p className="text-sm text-[#f0f0f0] mb-1">Email verified ✓</p>
          <p className="text-xs text-[#6b6b6b]">Your account is all set. <Link href="/" className="text-[#c4a832] hover:underline">Go to SETLST →</Link></p>
        </>
      )}
      {status === "error" && (
        <>
          <p className="text-sm text-[#d8d8d8] mb-1">This verification link is invalid or expired.</p>
          <p className="text-xs text-[#6b6b6b]">Sign in and use “Resend” to get a fresh link. <Link href="/login" className="text-[#c4a832] hover:underline">Sign in →</Link></p>
        </>
      )}
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/"><span className="font-serif text-3xl font-bold text-[#f0f0f0]">SETLST</span></Link>
        </div>
        <Suspense fallback={<div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-6 text-center text-sm text-[#6b6b6b]">Loading…</div>}>
          <VerifyInner />
        </Suspense>
      </div>
    </div>
  );
}
