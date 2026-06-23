"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Release {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  releaseDate: string;
}

export default function JustReleased() {
  const [album, setAlbum] = useState<Release | null>(null);

  useEffect(() => {
    fetch("/api/releases")
      .then((r) => r.json())
      .then((d: Release[]) => {
        if (!Array.isArray(d) || d.length === 0) return;
        // /api/releases is upcoming-only, sorted soonest-first — take the soonest to come.
        setAlbum(d[0]);
      })
      .catch(() => {});
  }, []);

  if (!album) return null;

  const date = new Date(album.releaseDate + "T00:00:00").toLocaleDateString("en-US", {
    month: "long", day: "numeric", year: "numeric",
  });
  const href =
    `/album/${album.id}?title=${encodeURIComponent(album.title)}&artist=${encodeURIComponent(album.artist)}` +
    (album.artwork ? `&artwork=${encodeURIComponent(album.artwork)}` : "");

  return (
    <div>
      <p className="text-[10px] text-[#6b6b6b] uppercase tracking-[0.15em] mb-3">Upcoming Release</p>
      <Link
        href={href}
        className="flex items-center gap-4 bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#c4a832] rounded-xl p-3 group transition-colors"
      >
        {album.artwork ? (
          <img src={album.artwork} alt={album.title} className="w-16 h-16 rounded-lg object-cover shrink-0 shadow" />
        ) : (
          <div className="w-16 h-16 rounded-lg bg-[#222222] shrink-0" />
        )}
        <div className="min-w-0">
          <p className="text-base text-[#f0f0f0] group-hover:text-[#c4a832] transition-colors truncate">{album.title}</p>
          <p className="text-sm text-[#a0a0a0] truncate">{album.artist}</p>
          <p className="text-xs text-[#c4a832] mt-0.5">{date}</p>
        </div>
      </Link>
    </div>
  );
}
