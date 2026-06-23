"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function FollowArtistButton({ artist }: { artist: string }) {
  const { status } = useSession();
  const router = useRouter();
  const [following, setFollowing] = useState(false);
  const [count, setCount] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/artist/follow?artist=${encodeURIComponent(artist)}`)
      .then((r) => r.json())
      .then((d) => { setFollowing(!!d.following); setCount(d.followerCount ?? 0); })
      .catch(() => {});
  }, [artist]);

  async function toggle() {
    if (status !== "authenticated") { router.push("/login"); return; }
    setBusy(true);
    // optimistic
    const next = !following;
    setFollowing(next);
    setCount((c) => (c == null ? c : c + (next ? 1 : -1)));
    try {
      const res = await fetch("/api/artist/follow", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ artist }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setFollowing(!!d.following);
    } catch {
      setFollowing(!next);
      setCount((c) => (c == null ? c : c + (next ? -1 : 1)));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex items-center gap-3">
      <button
        onClick={toggle}
        disabled={busy}
        className={`px-4 py-2 rounded-full text-sm transition-colors disabled:opacity-60 ${
          following
            ? "bg-[#222222] border border-[#2e2e2e] text-[#a0a0a0] hover:border-[#c4a832] hover:text-[#f0f0f0]"
            : "bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111]"
        }`}
      >
        {following ? "Following" : "Follow"}
      </button>
      {count != null && (
        <span className="text-xs text-[#6b6b6b]">
          {count} {count === 1 ? "follower" : "followers"}
        </span>
      )}
    </div>
  );
}
