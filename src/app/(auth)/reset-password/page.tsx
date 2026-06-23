"use client";
import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";

function ResetForm() {
  const params = useSearchParams();
  const router = useRouter();
  const token = params.get("token") ?? "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password.length < 8) return setError("Password must be at least 8 characters");
    if (password !== confirm) return setError("Passwords don't match");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Could not reset password"); setLoading(false); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 1800);
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  if (!token) {
    return (
      <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-6 text-center">
        <p className="text-sm text-[#d8d8d8] mb-1">Invalid reset link</p>
        <p className="text-xs text-[#6b6b6b]">Request a new one from the forgot-password page.</p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-6 text-center">
        <p className="text-sm text-[#d8d8d8] mb-1">Password updated</p>
        <p className="text-xs text-[#6b6b6b]">Redirecting you to sign in…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-6 space-y-4">
      {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
      <div>
        <label className="block text-xs text-[#a0a0a0] mb-1.5">New password</label>
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] transition-colors"
        />
      </div>
      <div>
        <label className="block text-xs text-[#a0a0a0] mb-1.5">Confirm new password</label>
        <input
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          placeholder="••••••••"
          className="w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] transition-colors"
        />
      </div>
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111] py-2.5 rounded-lg text-sm transition-colors"
      >
        {loading ? "Updating…" : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <span className="font-serif text-3xl font-bold text-[#f0f0f0] hover:text-[#c4a832] transition-colors">SETLST</span>
          </Link>
          <p className="mt-1.5 text-sm text-[#a0a0a0]">Choose a new password</p>
        </div>
        <Suspense fallback={<div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-6 text-center text-sm text-[#6b6b6b]">Loading…</div>}>
          <ResetForm />
        </Suspense>
        <p className="text-center mt-4 text-sm text-[#a0a0a0]">
          <Link href="/login" className="text-[#c4a832] hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
