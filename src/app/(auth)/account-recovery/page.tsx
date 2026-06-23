"use client";
import Link from "next/link";

const OPTIONS = [
  {
    href: "/sign-in-code",
    title: "Sign in with a code",
    desc: "Get a one-time code by email or text and sign in without your password.",
  },
  {
    href: "/forgot-password",
    title: "Reset your password",
    desc: "We'll email you a link to set a new password.",
  },
  {
    href: "/find-username",
    title: "Find your username",
    desc: "Forgot which username you used? We'll email it to you.",
  },
];

export default function AccountRecoveryPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/">
            <span className="font-serif text-3xl font-bold text-[#f0f0f0] hover:text-[#c4a832] transition-colors">SETLST</span>
          </Link>
          <p className="mt-1.5 text-sm text-[#a0a0a0]">Trouble signing in?</p>
        </div>

        <div className="space-y-3">
          {OPTIONS.map((o) => (
            <Link
              key={o.href}
              href={o.href}
              className="block bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#c4a832] rounded-xl p-4 transition-colors group"
            >
              <div className="flex items-center justify-between">
                <p className="text-sm text-[#f0f0f0] group-hover:text-[#c4a832] transition-colors">{o.title}</p>
                <span className="text-[#6b6b6b] group-hover:text-[#c4a832] transition-colors">→</span>
              </div>
              <p className="text-xs text-[#6b6b6b] mt-1 leading-relaxed">{o.desc}</p>
            </Link>
          ))}
        </div>

        <p className="text-center mt-5 text-sm text-[#a0a0a0]">
          <Link href="/login" className="text-[#c4a832] hover:underline">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
