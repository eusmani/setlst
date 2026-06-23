"use client";
import { useState } from "react";

interface Props {
  username: string;
  initial: boolean;
  initialRequested?: boolean;
  isPrivate?: boolean;
}

export default function FollowButton({ username, initial, initialRequested = false, isPrivate = false }: Props) {
  const [following, setFollowing] = useState(initial);
  const [requested, setRequested] = useState(initialRequested);
  const [loading, setLoading] = useState(false);

  async function toggle() {
    setLoading(true);
    const res = await fetch("/api/follow", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetUsername: username }),
    });
    setLoading(false);
    const d = await res.json();
    if (!d.error) {
      setFollowing(!!d.following);
      setRequested(!!d.requested);
    }
  }

  const label = loading
    ? "…"
    : following
    ? "Following"
    : requested
    ? "Requested"
    : isPrivate
    ? "Request"
    : "Follow";

  const active = following || requested; // muted style for both

  return (
    <button
      onClick={toggle}
      disabled={loading}
      className={`px-4 py-1.5 rounded text-sm transition-colors disabled:opacity-50 ${
        active
          ? "bg-[#222222] border border-[#2e2e2e] text-[#a0a0a0] hover:text-red-400 hover:border-red-900/40"
          : "bg-[#c4a832] hover:bg-[#d4ba44] text-[#111111]"
      }`}
    >
      {label}
    </button>
  );
}
