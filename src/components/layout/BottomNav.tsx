"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { useSession } from "next-auth/react";
import Avatar from "@/components/ui/Avatar";

const NAV: { href: string; label: string; icon: ReactNode; plus?: boolean; profile?: boolean }[] = [
  {
    href: "/", label: "Home",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
        <polyline points="9,21 9,12 15,12 15,21" />
      </svg>
    ),
  },
  {
    href: "/search", label: "Albums",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <circle cx="12" cy="12" r="2.5" strokeWidth="1.4" />
        <circle cx="12" cy="12" r="0.8" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    href: "/log", label: "Review", plus: true,
    icon: (
      <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    ),
  },
  {
    href: "/activity", label: "Activity",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="M7 14l4-4 3 3 5-6" />
      </svg>
    ),
  },
  {
    href: "/profile", label: "Profile", profile: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="8" r="4" />
        <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
      </svg>
    ),
  },
];

// Native-style bottom tab bar — primary navigation on phones (hidden at sm+,
// where the top Navbar's links take over).
export default function BottomNav() {
  const pathname = usePathname();
  // Current user (username + pfp) for the Profile tab, kept out of the session.
  const [me, setMe] = useState<{ username: string; avatar: string | null } | null>(null);
  // The session token already carries the username, so it's known on first
  // render. /api/me is only for the live value after a rename, and the avatar.
  const { data: session, status } = useSession();
  const username = me?.username ?? session?.user?.username ?? null;
  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => { if (d?.username) setMe(d); }).catch(() => {});
  }, []);

  return (
    <nav className="bottom-nav sm:hidden fixed inset-x-8 bottom-[calc(0.5rem+env(safe-area-inset-bottom))] z-50">
      {/* Opaque rather than translucent-with-blur: at 95% opacity the blur was
          invisible, but it forced the webview to re-composite the region behind
          the bar on every scroll frame — the main source of scroll stutter on
          phones, where this bar is always on screen. */}
      <div className="flex items-stretch justify-around h-[3.75rem] rounded-full border border-[#2e2e2e] bg-[#161616] shadow-2xl shadow-black/60 px-1">
        {NAV.map(({ href, label, icon, plus, profile }) => {
          // Go straight to the profile when the session already names the user.
          // Falling back to /profile (which resolves server-side) rather than
          // /login matters: /login was previously shown to people who were
          // signed in, just because an /api/me fetch hadn't returned yet.
          // Only an actually-unauthenticated session goes to sign-in.
          if (profile) {
            href = username
              ? `/profile/${username}`
              : status === "unauthenticated" ? "/login" : "/profile";
          }
          const active = profile ? pathname.startsWith("/profile") : href === "/" ? pathname === "/" : pathname.startsWith(href);

          // The center "+" is a prominent yellow action button (write a review).
          if (plus) {
            return (
              <Link key={href} href={href} aria-label={label} className="flex items-center justify-center flex-1">
                <span className="flex items-center justify-center w-11 h-11 -mt-2 rounded-full bg-[#c4a832] text-[#111111] shadow-lg shadow-black/40 active:scale-95 transition-transform">
                  {icon}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 text-[10px] tracking-wide transition-colors ${
                active ? "text-[#c4a832]" : "text-[#6b6b6b] hover:text-[#a0a0a0]"
              }`}
            >
              {profile && username ? (
                <span className={`rounded-full ${active ? "ring-2 ring-[#c4a832]" : ""}`}>
                  <Avatar username={username} avatar={me?.avatar ?? null} size={21} />
                </span>
              ) : (
                icon
              )}
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
