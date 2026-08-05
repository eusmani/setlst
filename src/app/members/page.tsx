"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import Avatar from "@/components/ui/Avatar";
import { hashPhones } from "@/lib/phone";
import { shareNative } from "@/lib/native";

interface Member {
  id: string;
  username: string;
  avatar: string | null;
  bio: string | null;
  _count?: { reviews: number; followers: number };
}

function FriendButton({ username, isFriend, busy, onClick }: { username: string; isFriend: boolean; busy: boolean; onClick: () => void }) {
  return (
    <button
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onClick(); }}
      disabled={busy}
      className={`shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        isFriend
          ? "bg-[#222222] border border-[#2e2e2e] text-[#a0a0a0] hover:border-red-500/50 hover:text-red-400"
          : "bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111]"
      }`}
    >
      {isFriend ? "Friends ✓" : "Add friend"}
    </button>
  );
}

export default function FriendsPage() {
  const { data: session, status } = useSession();
  // Live username from /api/me — the session token can be stale after a rename.
  const [meName, setMeName] = useState<string | null>(null);
  const me = meName ?? session?.user?.username;

  useEffect(() => {
    if (!session) { setMeName(null); return; }
    fetch("/api/me").then((r) => r.json()).then((d) => { if (d?.username) setMeName(d.username); }).catch(() => {});
  }, [session]);

  const [tab, setTab] = useState<"friends" | "find">("friends");
  const [friends, setFriends] = useState<Member[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<Member[]>([]);
  const [q, setQ] = useState("");
  const [blocked, setBlocked] = useState<string[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  // Contacts tab
  const [contactMatches, setContactMatches] = useState<Member[] | null>(null);
  const [contactStatus, setContactStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [canPickContacts, setCanPickContacts] = useState(false);
  const [invited, setInvited] = useState<"" | "shared" | "copied">("");

  const loadFriends = useCallback(() => {
    if (!me) return;
    fetch(`/api/follow?username=${encodeURIComponent(me)}`)
      .then((r) => r.json())
      .then((d) => {
        const f: Member[] = d.following ?? [];
        setFriends(f);
        setFollowingSet(new Set(f.map((u) => u.username)));
      })
      .catch(() => {});
  }, [me]);

  useEffect(() => {
    // Blocks are server-side; the API already filters blocked people out of
    // search and friend lists, this just keeps the client copy in sync.
    fetch("/api/block")
      .then((r) => r.json())
      .then((d) => setBlocked((d.blocked ?? []).map((u: { username: string }) => u.username)))
      .catch(() => {});
    // Contact Picker API exists only on Android Chrome; iOS Safari has none.
    setCanPickContacts(typeof navigator !== "undefined" && "contacts" in navigator && "ContactsManager" in window);
  }, []);

  // Cross-platform invite (iOS + Android) via the native share sheet, copy fallback.
  async function inviteFriends() {
    const url = typeof window !== "undefined" ? window.location.origin : "";
    // Native iOS share sheet inside the app; Web Share, then clipboard, on web.
    const outcome = await shareNative({
      title: "SETLST",
      text: "Join me on SETLST — log and rate the music you love.",
      url,
      dialogTitle: "Invite friends to SETLST",
    });
    if (outcome === "shared") setInvited("shared");
    else if (outcome === "copied") { setInvited("copied"); setTimeout(() => setInvited(""), 2500); }
  }
  useEffect(() => { loadFriends(); }, [loadFriends]);

  async function search(query: string) {
    const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
    const d = await res.json();
    setResults(Array.isArray(d) ? d : []);
  }
  useEffect(() => { if (tab === "find") search(""); /* eslint-disable-next-line */ }, [tab]);

  // Numbers are hashed on the device — only digests leave the phone, and the
  // server keeps none of them (App Store guideline 5.1.2).
  async function matchPhones(phones: string[]) {
    setContactStatus("loading");
    try {
      const hashes = await hashPhones(phones);
      const r = await fetch("/api/users/by-phone", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hashes }),
      });
      const d = await r.json();
      setContactMatches(Array.isArray(d) ? d : []);
      setContactStatus("done");
    } catch {
      setContactStatus("error");
    }
  }

  async function syncContacts() {
    // Contact Picker API (Chrome on Android). Numbers are matched, never stored.
    const nav = navigator as Navigator & {
      contacts?: { select: (props: string[], opts: { multiple: boolean }) => Promise<{ tel?: string[] }[]> };
    };
    if (!nav.contacts?.select) { setContactStatus("error"); return; }
    try {
      const picked = await nav.contacts.select(["tel"], { multiple: true });
      const phones = picked.flatMap((c) => c.tel ?? []);
      if (phones.length === 0) { setContactMatches([]); setContactStatus("done"); return; }
      await matchPhones(phones);
    } catch {
      setContactStatus("idle"); // user cancelled the picker
    }
  }

  async function toggleFriend(username: string) {
    setBusy(username);
    try {
      const r = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername: username }),
      });
      const d = await r.json();
      setFollowingSet((prev) => {
        const s = new Set(prev);
        if (d.following) s.add(username); else s.delete(username);
        return s;
      });
      loadFriends();
    } catch {} finally { setBusy(null); }
  }

  if (status !== "loading" && !session) {
    return (
      <div className="max-w-2xl mx-auto px-5 py-16 text-center">
        <p className="text-[#a0a0a0] text-sm">
          <Link href="/login" className="text-[#c4a832] hover:underline">Sign in</Link> to add friends and see their activity.
        </p>
      </div>
    );
  }

  const visibleFriends = friends.filter((m) => !blocked.includes(m.username));
  // Find People shows only people you're NOT already friends with — friends live in the Friends tab.
  const visibleResults = results.filter((m) => m.username !== me && !blocked.includes(m.username) && !followingSet.has(m.username));

  const Row = ({ m }: { m: Member }) => (
    <div className="flex items-center gap-4 p-4 bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2e2e2e] rounded-xl transition-colors">
      <Link href={`/profile/${m.username}`} className="flex items-center gap-4 flex-1 min-w-0 group">
        <Avatar username={m.username} avatar={m.avatar} size={42} />
        <div className="flex-1 min-w-0">
          <p className="text-[#f0f0f0] group-hover:text-[#c4a832] transition-colors text-sm">{m.username}</p>
          {m.bio && <p className="text-xs text-[#a0a0a0] truncate mt-0.5">{m.bio}</p>}
        </div>
      </Link>
      <FriendButton username={m.username} isFriend={followingSet.has(m.username)} busy={busy === m.username} onClick={() => toggleFriend(m.username)} />
    </div>
  );

  return (
    <div className="max-w-3xl mx-auto px-5 pt-5 pb-12">
      <h1 className="font-serif text-3xl text-[#f0f0f0] mb-5">Friends</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-[#1f1f1f] mb-6">
        {([
          { k: "friends", label: `Friends${friends.length ? ` (${friends.length})` : ""}` },
          { k: "find", label: "Find People" },
        ] as const).map(({ k, label }) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-4 py-2.5 text-sm -mb-px border-b-2 transition-colors ${
              tab === k ? "border-[#c4a832] text-[#f0f0f0]" : "border-transparent text-[#6b6b6b] hover:text-[#a0a0a0]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "friends" && (
        visibleFriends.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-[#a0a0a0] text-sm mb-2">You haven&apos;t added any friends yet.</p>
            <button onClick={() => setTab("find")} className="text-xs text-[#c4a832] hover:underline">Find people to add →</button>
          </div>
        ) : (
          <div className="space-y-2">{visibleFriends.map((m) => <Row key={m.id} m={m} />)}</div>
        )
      )}

      {tab === "find" && (
        <>
          {/* Username search */}
          <div className="relative mb-6">
            <svg className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#6b6b6b]" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); search(e.target.value); }}
              placeholder="Search people by username…"
              className="w-full bg-[#1a1a1a] border border-[#2e2e2e] text-[#f0f0f0] rounded-lg pl-9 pr-4 py-3 text-sm focus:outline-none focus:border-[#c4a832] placeholder-[#6b6b6b] transition-colors"
            />
          </div>
          {visibleResults.length === 0 ? (
            <p className="text-center text-[#6b6b6b] text-sm py-10">No people found</p>
          ) : (
            <div className="space-y-2">{visibleResults.map((m) => <Row key={m.id} m={m} />)}</div>
          )}

          {/* Contacts — below the people list, with spacing */}
          <div className="mt-10 pt-6 border-t border-[#1f1f1f]">
            <div className="flex gap-2 flex-wrap">
              {canPickContacts && (
                <button
                  onClick={syncContacts}
                  disabled={contactStatus === "loading"}
                  className="bg-[#c4a832] hover:bg-[#d4ba44] disabled:opacity-50 text-[#111111] text-sm px-4 py-2.5 rounded-lg transition-colors"
                >
                  {contactStatus === "loading" ? "Matching…" : "Sync phone contacts"}
                </button>
              )}
              <button
                onClick={inviteFriends}
                className="border border-[#2e2e2e] hover:border-[#c4a832] text-[#a0a0a0] hover:text-[#f0f0f0] text-sm px-4 py-2.5 rounded-lg transition-colors"
              >
                {invited === "copied" ? "Link copied ✓" : "Invite friends"}
              </button>
            </div>
            <p className="text-xs text-[#6b6b6b] mt-2">
              {canPickContacts
                ? "Sync your contacts to find friends already here, or invite the rest."
                : "Invite friends from your contacts via your share sheet (works on iPhone & Android)."}
              {" "}Add your number under{" "}
              <Link href={`/profile/${me}`} className="text-[#c4a832] hover:underline">Edit profile</Link> so friends can find you.
            </p>
            {contactStatus === "error" && (
              <p className="text-xs text-[#6b6b6b] mt-2">Couldn&apos;t read contacts — use Invite friends instead.</p>
            )}
            {contactMatches !== null && (
              <div className="mt-4">
                <p className="text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-3">
                  {contactMatches.length} {contactMatches.length === 1 ? "match" : "matches"}
                </p>
                {contactMatches.length === 0 ? (
                  <p className="text-sm text-[#6b6b6b]">No contacts found on SETLST yet.</p>
                ) : (
                  <div className="space-y-2">
                    {contactMatches.filter((m) => !blocked.includes(m.username) && !followingSet.has(m.username)).map((m) => <Row key={m.id} m={m} />)}
                  </div>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
