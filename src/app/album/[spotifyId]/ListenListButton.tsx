"use client";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";

interface Props {
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
}

export default function ListenListButton({ spotifyId, title, artist, artwork, year }: Props) {
  const { status } = useSession();
  const router = useRouter();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (status !== "authenticated") return;
    fetch(`/api/saved?spotifyId=${encodeURIComponent(spotifyId)}`)
      .then((r) => r.json())
      .then((d) => setSaved(!!d.saved))
      .catch(() => {});
  }, [spotifyId, status]);

  async function toggle() {
    if (status !== "authenticated") { router.push("/login"); return; }
    setBusy(true);
    const next = !saved;
    setSaved(next); // optimistic
    try {
      const res = await fetch("/api/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ spotifyId, title, artist, artwork, year }),
      });
      if (!res.ok) throw new Error();
      const d = await res.json();
      setSaved(!!d.saved);
    } catch {
      setSaved(!next);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-60 ${
        saved
          ? "bg-[#222222] border border-[#c4a832] text-[#c4a832]"
          : "bg-[#1a1a1a] border border-[#2e2e2e] text-[#a0a0a0] hover:border-[#c4a832] hover:text-[#f0f0f0]"
      }`}
      title="Albums you still have to listen to"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill={saved ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
        <path d="M6 2h12a1 1 0 0 1 1 1v18l-7-4-7 4V3a1 1 0 0 1 1-1z" />
      </svg>
      {saved ? "In your Listen List" : "Add to Listen List"}
    </button>
  );
}
