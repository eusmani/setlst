"use client";
import { useEffect, useState, useSyncExternalStore } from "react";
import AlbumCard from "@/components/album/AlbumCard";
import {
  subscribeRecentAlbums,
  getRecentAlbumsSnapshot,
  getRecentAlbumsServerSnapshot,
} from "@/lib/recentAlbums";

interface Entry {
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
  at: number;
}

// Albums you've been at recently, from two sources that cover different gaps:
//
//   localStorage — everything you opened, including albums you never reviewed,
//                  but only on this device.
//   /api/me/recent-albums — everything you reviewed, from any device.
//
// Merged newest-first and deduped by album, so reviewing something you'd already
// clicked shows it once, at its most recent timestamp.
export default function RecentlyViewed({
  limit = 6,
  heading = "Recently Viewed",
  emptyMessage = "Albums you open or review will show up here.",
}: {
  limit?: number;
  heading?: string;
  // Shown in place of the grid before you've opened anything, so the section
  // holds its spot under the search bar instead of appearing out of nowhere.
  emptyMessage?: string;
}) {
  const viewed = useSyncExternalStore(
    subscribeRecentAlbums,
    getRecentAlbumsSnapshot,
    getRecentAlbumsServerSnapshot,
  );
  const [reviewed, setReviewed] = useState<Entry[]>([]);

  useEffect(() => {
    let live = true;
    fetch("/api/me/recent-albums")
      .then((r) => r.json())
      .then((d) => { if (live && Array.isArray(d)) setReviewed(d); })
      .catch(() => {}); // signed out, offline — the local half still renders
    return () => { live = false; };
  }, []);

  const byAlbum = new Map<string, Entry>();
  for (const a of [
    ...viewed.map((v) => ({
      spotifyId: v.spotifyId, title: v.title, artist: v.artist,
      artwork: v.artwork, year: v.year, at: v.viewedAt,
    })),
    ...reviewed,
  ]) {
    const seen = byAlbum.get(a.spotifyId);
    // Keep whichever record is newer — a review edit should outrank an old click.
    if (!seen || a.at > seen.at) byAlbum.set(a.spotifyId, a);
  }

  const rows = [...byAlbum.values()].sort((a, b) => b.at - a.at).slice(0, limit);

  if (rows.length === 0) {
    return (
      <div className="mb-8">
        <p className="text-xl text-[#6b6b6b] uppercase tracking-[0.15em] mb-4">{heading}</p>
        <div className="bg-[#1a1a1a] border border-[#1f1f1f] rounded-lg px-5 py-8 text-center">
          <p className="text-sm text-[#a0a0a0]">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8">
      <p className="text-xl text-[#6b6b6b] uppercase tracking-[0.15em] mb-4">{heading}</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {rows.map((a) => (
          <AlbumCard
            key={a.spotifyId}
            spotifyId={a.spotifyId}
            title={a.title}
            artist={a.artist}
            artwork={a.artwork}
            year={a.year}
          />
        ))}
      </div>
    </div>
  );
}
