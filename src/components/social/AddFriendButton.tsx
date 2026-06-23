"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function AddFriendButton({ username }: { username: string }) {
  const { status } = useSession();
  const router = useRouter();
  const [friend, setFriend] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") { setFriend(false); return; }
    fetch(`/api/follow?username=${encodeURIComponent(username)}`)
      .then((r) => r.json())
      .then((d) => setFriend(!!d.isFollowing))
      .catch(() => setFriend(false));
  }, [username, status]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (status !== "authenticated") { router.push("/login"); return; }
    setBusy(true);
    try {
      const r = await fetch("/api/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetUsername: username }),
      });
      const d = await r.json();
      setFriend(!!d.following);
    } catch {} finally { setBusy(false); }
  }

  if (friend === null) return null;

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`shrink-0 text-xs px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50 ${
        friend
          ? "bg-[#222222] border border-[#2e2e2e] text-[#a0a0a0] hover:border-red-500/50 hover:text-red-400"
          : "bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111]"
      }`}
    >
      {friend ? "Friends ✓" : "Add friend"}
    </button>
  );
}
