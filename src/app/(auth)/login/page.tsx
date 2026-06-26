"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const r = await signIn("credentials", { identifier, password, redirect: false });
    setLoading(false);
    if (r?.error) setError("Invalid login or password");
    else { router.push("/"); router.refresh(); }
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <span className="font-serif text-3xl font-bold text-[#f0f0f0] hover:text-[#c4a832] transition-colors">SETLST</span>
          </Link>
          <p className="mt-1.5 text-sm text-[#a0a0a0]">Welcome back! Sign in and start reviewing!</p>
        </div>

        <form onSubmit={submit} className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-6 space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/30 px-3 py-2 rounded-lg">{error}</p>}

          {[
            { label: "Email or username", type: "text", val: identifier, set: setIdentifier, ph: "you@example.com or your username", noCap: true },
            { label: "Password", type: "password", val: password, set: setPassword, ph: "••••••••" },
          ].map(({ label, type, val, set, ph, noCap }) => (
            <div key={label}>
              <label className="block text-xs text-[#a0a0a0] mb-1.5">{label}</label>
              <input
                type={type}
                value={val}
                onChange={(e) => set(e.target.value)}
                required
                placeholder={ph}
                autoCapitalize={noCap ? "none" : undefined}
                autoCorrect={noCap ? "off" : undefined}
                spellCheck={noCap ? false : undefined}
                className="w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] transition-colors"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111]  py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? "Signing in…" : "Sign in"}
          </button>

          <div className="text-center space-y-1">
            <Link href="/forgot-password" className="block text-xs text-[#6b6b6b] hover:text-[#c4a832] transition-colors">
              Forgot your password?
            </Link>
            <Link href="/account-recovery" className="block text-xs text-[#6b6b6b] hover:text-[#c4a832] transition-colors">
              Trouble signing in?
            </Link>
          </div>
        </form>

        <p className="text-center mt-4 text-sm text-[#a0a0a0]">
          No account?{" "}
          <Link href="/register" className="text-[#c4a832] hover:underline">Join SETLST</Link>
        </p>
      </div>
    </div>
  );
}
