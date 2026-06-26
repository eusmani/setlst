"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, email, password, phone }),
    });
    if (!res.ok) {
      setError((await res.json()).error ?? "Registration failed");
      setLoading(false);
      return;
    }
    await signIn("credentials", { identifier: email, password, redirect: false });
    router.push("/onboarding");
    router.refresh();
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <span className="font-serif text-3xl font-bold text-[#f0f0f0] hover:text-[#c4a832] transition-colors">SETLST</span>
          </Link>
          <p className="mt-1.5 text-sm text-[#a0a0a0]">Create your account</p>
        </div>

        <form onSubmit={submit} className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-xl p-6 space-y-4">
          {error && <p className="text-red-400 text-sm bg-red-950/30 border border-red-900/30 px-3 py-2 rounded-lg">{error}</p>}

          {[
            { label: "Username", type: "text", val: username, set: setUsername, ph: "yourname", min: 3, max: 20, optional: false, lc: true },
            { label: "Email", type: "email", val: email, set: setEmail, ph: "you@example.com", optional: false },
            { label: "Phone number", type: "tel", val: phone, set: setPhone, ph: "(555) 123-4567" },
            { label: "Password", type: "password", val: password, set: setPassword, ph: "min 8 characters", min: 8 },
          ].map(({ label, type, val, set, ph, min, max, lc }) => (
            <div key={label}>
              <label className="block text-xs text-[#a0a0a0] mb-1.5">{label}</label>
              <input
                type={type}
                value={val}
                onChange={(e) => set(lc ? e.target.value.toLowerCase() : e.target.value)}
                required
                minLength={min}
                maxLength={max}
                placeholder={ph}
                autoCapitalize={lc ? "none" : undefined}
                autoCorrect={lc ? "off" : undefined}
                spellCheck={lc ? false : undefined}
                className="w-full bg-[#222222] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] transition-colors"
              />
            </div>
          ))}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111]  py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="text-center mt-4 text-sm text-[#a0a0a0]">
          Already have an account?{" "}
          <Link href="/login" className="text-[#c4a832] hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
