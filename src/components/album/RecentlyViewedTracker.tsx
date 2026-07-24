"use client";
import { useEffect } from "react";
import { recordRecentAlbum } from "@/lib/recentAlbums";

// Renders nothing — it exists to record the album you're currently looking at,
// so /search can offer it back under "Recently Viewed". Logging a review happens
// on this page too, which is why reviewed albums need no separate tracking.
export default function RecentlyViewedTracker({
  spotifyId, title, artist, artwork, year,
}: {
  spotifyId: string;
  title: string;
  artist: string;
  artwork?: string | null;
  year?: number | null;
}) {
  useEffect(() => {
    recordRecentAlbum({
      spotifyId, title, artist,
      artwork: artwork ?? null,
      year: year ?? null,
    });
  }, [spotifyId, title, artist, artwork, year]);

  return null;
}
