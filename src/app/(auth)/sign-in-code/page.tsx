"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignInCodePage() {
  const router = useRouter();
  const [step, setStep] = useState<"request" | "verify">("request");
  const [identifier, setIdentifier] = useState("");
  const [channel, setChannel] = useState<"email" | "sms">("email");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function requestCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(d.error || "Couldn't send a code. Try again in a bit.");
        setLoading(false);
        return;
      }
      setChannel(d.channel === "sms" ? "sms" : "email");
      setStep("verify");
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const r = await signIn("code", { identifier, code: code.trim(), redirect: false });
    setLoading(false);
    if (r?.error) setError("That code is invalid or expired.");
    else { router.push("/"); router.refresh(); }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <span className="font-serif text-3xl font-bold text-[#f0f0f0] hover:text-[#c4a832] transition-colors">SETLST</span>
          </Link>
          <p className="mt-1.5 text-sm text-[#a0a0a0]">Sign in with a code</p>
        </div>

        {step === "request" ? (
          <form onSubmit={requestCode} className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-6 space-y-4">
            {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
            <p className="text-xs text-[#6b6b6b] leading-relaxed">
              Enter the email or phone number on your account and we&apos;ll send you a one-time code to sign in.
            </p>
            <div>
              <label className="block text-xs text-[#a0a0a0] mb-1.5">Email or phone</label>
              <input
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                required
                placeholder="you@example.com or (555) 123-4567"
                className="w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !identifier}
              className="w-full bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111] py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? "Sending…" : "Send me a code"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-6 space-y-4">
            {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/30 px-3 py-2 rounded-lg">{error}</p>}
            <p className="text-xs text-[#6b6b6b] leading-relaxed">
              If an account matches <span className="text-[#a0a0a0]">{identifier}</span>, we sent a 6-digit code by {channel === "sms" ? "text message" : "email"}. Enter it below. It expires in 10 minutes.
            </p>
            <div>
              <label className="block text-xs text-[#a0a0a0] mb-1.5">Sign-in code</label>
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                required
                placeholder="123456"
                className="w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2.5 text-center text-lg tracking-[0.4em] focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={loading || code.length < 6}
              className="w-full bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111] py-2.5 rounded-lg text-sm transition-colors"
            >
              {loading ? "Verifying…" : "Verify & sign in"}
            </button>
            <button
              type="button"
              onClick={() => { setStep("request"); setCode(""); setError(""); }}
              className="w-full text-xs text-[#6b6b6b] hover:text-[#c4a832] transition-colors"
            >
              Use a different email or phone
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
