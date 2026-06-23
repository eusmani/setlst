"use client";
import { useState } from "react";
import Link from "next/link";

export default function FindUsernamePage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch("/api/auth/find-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
    } catch {}
    setLoading(false);
    setSent(true);
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <span className="font-serif text-3xl font-bold text-[#f0f0f0] hover:text-[#c4a832] transition-colors">SETLST</span>
          </Link>
          <p className="mt-1.5 text-sm text-[#a0a0a0]">Find your username</p>
        </div>

        {sent ? (
          <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-6 text-center">
            <p className="text-sm text-[#d8d8d8] mb-2">Check your email</p>
            <p className="text-xs text-[#6b6b6b] leading-relaxed">
              If an account exists for <span className="text-[#a0a0a0]">{email}</span>, we&apos;ve emailed you the username for that account.
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-6 space-y-4">
            <p className="text-xs text-[#6b6b6b] leading-relaxed">
              Forgot which username you used? Enter your account email and we&apos;ll send it to you.
            </p>
            <div>
              <label className="block text-xs text-[#a0a0a0] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !email}
              className="w-full bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111] py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? "Sending…" : "Email me my username"}
            </button>
          </form>
        )}

        <p className="text-center mt-4 text-sm text-[#a0a0a0]">
          <Link href="/account-recovery" className="text-[#c4a832] hover:underline">More ways to sign in</Link>
          <span className="text-[#6b6b6b]"> · </span>
          <Link href="/login" className="text-[#c4a832] hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
