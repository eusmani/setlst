"use client";
import { useEffect, useState } from "react";
import AlbumCard from "@/components/album/AlbumCard";

interface Rec {
  id: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
}

export default function SimilarAlbums({ artist, genre, excludeId }: { artist: string; genre?: string; excludeId: string }) {
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams({ artist, exclude: excludeId });
    if (genre) params.set("genre", genre);
    fetch(`/api/similar?${params}`)
      .then((r) => r.json())
      .then((d) => { setRecs(Array.isArray(d) ? d : []); setLoaded(true); })
      .catch(() => setLoaded(true));
  }, [artist, genre, excludeId]);

  if (loaded && recs.length === 0) return null;

  return (
    <div className="mt-10">
      <h2 className="text-sm text-[#a0a0a0] uppercase tracking-[0.15em] mb-4">You may like…</h2>
      {!loaded ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-lg bg-[#1a1a1a] border border-[#1f1f1f] aspect-square animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {recs.map((a) => (
            <AlbumCard key={a.id} spotifyId={a.id} title={a.title} artist={a.artist} artwork={a.artwork} year={a.year} />
          ))}
        </div>
      )}
    </div>
  );
}
