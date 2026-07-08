"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import Avatar from "@/components/ui/Avatar";

const NAV: { href: string; label: string; icon: ReactNode; plus?: boolean; profile?: boolean }[] = [
  {
    href: "/inbox", label: "Inbox",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <line x1="22" y1="2" x2="11" y2="13" />
        <polygon points="22 2 15 22 11 13 2 9 22 2" />
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
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
  const username = me?.username ?? null;
  useEffect(() => {
    fetch("/api/me").then((r) => r.json()).then((d) => { if (d?.username) setMe(d); }).catch(() => {});
  }, []);

  return (
    <nav className="bottom-nav sm:hidden fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50">
      <div className="flex items-stretch justify-around h-14 rounded-2xl border border-[#2e2e2e] bg-[#1a1a1a]/95 backdrop-blur-md shadow-2xl shadow-black/60 px-1">
        {NAV.map(({ href, label, icon, plus, profile }) => {
          // Profile tab points at the current user (or login when signed out).
          if (profile) href = username ? `/profile/${username}` : "/login";
          const active = profile ? pathname.startsWith("/profile") : href === "/" ? pathname === "/" : pathname.startsWith(href);

          // The center "+" is a prominent yellow action button (write a review).
          if (plus) {
            return (
              <Link key={href} href={href} aria-label={label} className="flex items-center justify-center flex-1">
                <span className="flex items-center justify-center w-12 h-12 -mt-3 rounded-full bg-[#c4a832] text-[#111111] shadow-lg shadow-black/40 active:scale-95 transition-transform">
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
                  <Avatar username={username} avatar={me?.avatar ?? null} size={22} />
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
