"use client";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState, useEffect, useRef } from "react";
import Avatar from "@/components/ui/Avatar";

const NAV = [
  {
    href: "/", label: "Home",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"/>
        <polyline points="9,21 9,12 15,12 15,21"/>
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
    href: "/activity", label: "Activity",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18"/>
        <path d="M7 14l4-4 3 3 5-6"/>
      </svg>
    ),
  },
  {
    href: "/members", label: "Friends",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
        <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: "/diary", label: "News",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
        <line x1="8" y1="7" x2="16" y2="7"/>
        <line x1="8" y1="11" x2="16" y2="11"/>
        <line x1="8" y1="15" x2="12" y2="15"/>
      </svg>
    ),
  },
];

export default function Navbar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const [userOpen, setUserOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [me, setMe] = useState<{ username: string; avatar: string | null } | null>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Unread shared-discussion count for the inbox badge.
  useEffect(() => {
    if (!session) { setUnread(0); return; }
    fetch("/api/inbox", { method: "POST" }).then((r) => r.json()).then((d) => setUnread(d.count ?? 0)).catch(() => {});
  }, [session]);

  // Live username + avatar for the top-bar pfp and profile link (kept out of the
  // session so auth() stays fast). Re-fetches on navigation so a pic/name change shows.
  useEffect(() => {
    if (!session) { setMe(null); return; }
    fetch("/api/me").then((r) => r.json()).then((d) => { if (d) setMe(d); }).catch(() => {});
  }, [session, pathname]);

  const displayName = me?.username ?? session?.user?.username ?? "";
  const pfp = me?.avatar ?? null;

  // Close the user dropdown when clicking anywhere outside it.
  useEffect(() => {
    if (!userOpen) return;
    const onDown = (e: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [userOpen]);

  return (
    <>
    {/* Fixed so it never shifts during momentum/rubber-band scroll in the iOS webview. */}
    <nav className="fixed top-0 inset-x-0 z-50 border-b border-[#1f1f1f] bg-[#111111] sm:bg-[#111111]/96 sm:backdrop-blur-sm">
      <div className="max-w-6xl mx-auto pl-3 pr-5 sm:px-8 h-16 flex items-center gap-10">

        {/* Logo */}
        <Link href="/" className="app-logo flex items-center gap-2 font-serif text-3xl font-bold tracking-wide text-[#f0f0f0] hover:text-[#c4a832] transition-colors shrink-0">
          <img src="/turntable-logo.png" alt="" className="w-12 h-12 shrink-0 object-contain" />
          SETLST
        </Link>

        {/* Desktop nav links */}
        <div className="hidden sm:flex items-center justify-center gap-10 lg:gap-14 flex-1">
          {NAV.map(({ href, label, icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={`p-3 rounded-md transition-colors relative group ${
                  active
                    ? "bg-[#222222] text-[#c4a832]"
                    : "text-[#a0a0a0] hover:text-[#f0f0f0] hover:bg-[#1a1a1a]"
                }`}
              >
                {icon}
                <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 px-2 py-1 bg-[#222222] text-[#f0f0f0] text-[10px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none border border-[#2e2e2e]">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3 ml-auto">
          {/* Get the iOS app — desktop only (you're already in it on mobile) */}
          <Link
            href="/download"
            className="hidden sm:inline-flex items-center gap-1.5 text-xs border border-[#2e2e2e] hover:border-[#c4a832] text-[#a0a0a0] hover:text-[#c4a832] px-2.5 py-1 rounded-full transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="7" y="2" width="10" height="20" rx="2" /><line x1="11" y1="18" x2="13" y2="18" />
            </svg>
            Download app
          </Link>
          {session ? (
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserOpen(!userOpen)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors"
              >
                {/* Mobile: hamburger (3 lines) */}
                <div className="relative sm:hidden text-[#f0f0f0] p-0.5">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
                  </svg>
                  {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#c4a832] border border-[#111111]" />}
                </div>
                {/* Desktop: avatar + name + chevron */}
                <div className="relative hidden sm:block">
                  <Avatar username={displayName} avatar={pfp} size={36} />
                  {unread > 0 && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#c4a832] border border-[#111111]" />}
                </div>
                <span className="nav-username text-sm text-[#f0f0f0] hidden sm:block">{displayName}</span>
                <svg className="text-[#6b6b6b] hidden sm:block" width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="2,4 6,8 10,4" />
                </svg>
              </button>

              {userOpen && (
                <>
                  <div className="absolute right-0 top-10 z-20 w-44 bg-[#1a1a1a] border border-[#2e2e2e] rounded-lg overflow-hidden shadow-2xl">
                    <div className="px-4 py-2.5 border-b border-[#1f1f1f]">
                      <p className="text-xs text-[#6b6b6b]">Signed in as</p>
                      <p className="text-sm  text-[#f0f0f0] truncate">{displayName}</p>
                    </div>
                    {/* Desktop: Profile (on mobile, Profile lives in the bottom bar) */}
                    <Link
                      href={`/profile/${displayName}`}
                      className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#f0f0f0] hover:bg-[#222222] transition-colors"
                      onClick={() => setUserOpen(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
                      </svg>
                      Profile
                    </Link>
                    {/* Mobile: News (replaces Profile, which moved to the bottom bar) */}
                    <Link
                      href="/diary"
                      className="flex sm:hidden items-center gap-2.5 px-4 py-2.5 text-sm text-[#f0f0f0] hover:bg-[#222222] transition-colors"
                      onClick={() => setUserOpen(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
                      </svg>
                      News
                    </Link>
                    {/* Desktop: Inbox lives here (on mobile it's in the bottom bar) */}
                    <Link
                      href="/inbox"
                      className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#f0f0f0] hover:bg-[#222222] transition-colors"
                      onClick={() => { setUserOpen(false); setUnread(0); }}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                      </svg>
                      Messages
                      {unread > 0 && <span className="ml-auto text-[10px] bg-[#c4a832] text-[#111111] rounded-full px-1.5 py-0.5 font-bold">{unread}</span>}
                    </Link>
                    {/* Mobile: Friends (it moved out of the bottom bar to make room for Inbox) */}
                    <Link
                      href="/members"
                      className="flex sm:hidden items-center gap-2.5 px-4 py-2.5 text-sm text-[#f0f0f0] hover:bg-[#222222] transition-colors"
                      onClick={() => setUserOpen(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      Friends
                    </Link>
                    {/* Desktop only — on mobile the bottom-bar + button covers logging. */}
                    <Link
                      href="/search"
                      className="hidden sm:flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#f0f0f0] hover:bg-[#222222] transition-colors"
                      onClick={() => setUserOpen(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                      </svg>
                      Log an album
                    </Link>
                    <Link
                      href="/plus"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#c4a832] font-medium hover:bg-[#222222] transition-colors"
                      onClick={() => setUserOpen(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                      SETLST Plus
                    </Link>
                    <Link
                      href="/settings"
                      className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#f0f0f0] hover:bg-[#222222] transition-colors"
                      onClick={() => setUserOpen(false)}
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                      Settings
                    </Link>
                    <div className="border-t border-[#1f1f1f]">
                      <button
                        onClick={() => { setUserOpen(false); signOut(); }}
                        className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-[#a0a0a0] hover:bg-[#222222] hover:text-[#f0f0f0] transition-colors"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
                        </svg>
                        Sign out
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {/* Desktop only — on mobile, Sign in is reached from the Join page. */}
              <Link href="/login" className="hidden sm:inline-block text-sm text-[#a0a0a0] hover:text-[#f0f0f0] px-3 py-1.5 rounded-md hover:bg-[#1a1a1a] transition-colors">
                Sign in
              </Link>
              {/* Desktop only — mobile signed-out users sign up from the home hero / prompts */}
              <Link href="/register" className="hidden sm:inline-block text-sm bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111]  px-3 py-1.5 rounded-md transition-colors">
                Join
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
    </>
  );
}
