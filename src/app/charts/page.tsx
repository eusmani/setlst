"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ratingTier } from "@/lib/rating";

interface TrendingRow {
  spotifyId: string;
  title: string;
  artist: string;
  artwork: string | null;
  year: number | null;
  reviewCount: number;
  likeCount: number;
  saveCount: number;
  commentCount: number;
  avgRating: number | null;
}

function albumHref(a: TrendingRow) {
  const q = new URLSearchParams({ title: a.title, artist: a.artist });
  if (a.artwork) q.set("artwork", a.artwork);
  return `/album/${a.spotifyId}?${q.toString()}`;
}

export default function ChartsPage() {
  const [rows, setRows] = useState<TrendingRow[] | null>(null);

  useEffect(() => {
    fetch("/api/trending")
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, []);

  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <div className="mb-8">
        <h1 className="font-serif text-3xl text-[#f0f0f0]">Trending</h1>
        <p className="text-sm text-[#6b6b6b] mt-1">
          Discover this weeks hottest albums, log a new review, or revisit an old album from your collection.
        </p>
      </div>

      {rows === null ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-16 rounded-xl bg-[#1a1a1a] border border-[#1f1f1f] animate-pulse" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-[#a0a0a0] text-sm mb-1">No trending albums yet</p>
          <p className="text-[#6b6b6b] text-xs">
            As people review, save and like albums, the most popular ones will rank here.{" "}
            <Link href="/search" className="text-[#c4a832] hover:underline">Start exploring →</Link>
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((a, i) => (
            <Link
              key={a.spotifyId}
              href={albumHref(a)}
              className="flex items-center gap-4 p-3 bg-[#1a1a1a] border border-[#1f1f1f] hover:border-[#2e2e2e] rounded-xl group transition-colors"
            >
              <span className="w-6 text-center font-serif text-lg text-[#6b6b6b] shrink-0">{i + 1}</span>
              {a.artwork ? (
                <img src={a.artwork} alt={a.title} className="w-12 h-12 rounded object-cover shrink-0" />
              ) : (
                <div className="w-12 h-12 rounded bg-[#222222] shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[#f0f0f0] group-hover:text-[#c4a832] transition-colors truncate">{a.title}</p>
                <p className="text-xs text-[#a0a0a0] truncate">{a.artist}{a.year ? ` · ${a.year}` : ""}</p>
              </div>
              <div className="flex items-center gap-4 shrink-0 text-right">
                <div>
                  <p className="text-xs text-[#6b6b6b]">{a.reviewCount} {a.reviewCount === 1 ? "review" : "reviews"}</p>
                  <p className="text-[10px] text-[#6b6b6b]">{a.likeCount + a.saveCount} saves/likes</p>
                </div>
                {a.avgRating != null && (
                  <span className="text-base font-bold w-9 text-center" style={{ color: ratingTier(a.avgRating).color }}>
                    {ratingTier(a.avgRating).letter}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
