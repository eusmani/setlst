"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { ViewTransition } from "react";
import { Skeleton } from "@/components/ui/Skeleton";

// Shown while the album page's shell is fetched.
//
// This is a client component for one reason: it's the tree the router swaps in
// on navigation, so it — not the real page — is what a tapped album cover has
// to morph into. Giving it the same view-transition name is what lets the cover
// travel at all; without it the card's cover has nothing to pair with and the
// morph is dropped.
//
// AlbumCard / AlbumRow already put the cover URL in the link's query string, so
// the placeholder paints the real artwork and the morph lands on the image
// rather than a grey box. Links that carry no artwork (a review card thumbnail,
// a pasted URL) skip the pairing and fade in as before.
//
// The layout mirrors the real page's header row and 200px cover column; if the
// two disagreed the cover would land in the wrong spot and jump once the page
// arrived.
export default function Loading() {
  const pathname = usePathname();
  const search = useSearchParams();

  const spotifyId = pathname?.split("/album/")[1]?.split("/")[0] ?? "";
  const artwork = search?.get("artwork") ?? null;

  const cover = artwork ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={artwork} alt="" className="w-full rounded-xl shadow-xl aspect-square object-cover" />
  ) : (
    <Skeleton className="w-full aspect-square rounded-xl" />
  );

  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      {/* Back link + share row */}
      <div className="flex items-center justify-between mb-6">
        <Skeleton className="h-4 w-28 rounded" />
        <Skeleton className="h-6 w-6 rounded-full" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-7 mb-10">
        <div className="sm:col-span-1">
          {artwork && spotifyId ? (
            <ViewTransition name={`album-cover-${spotifyId}`} share="album-cover">
              {cover}
            </ViewTransition>
          ) : (
            cover
          )}
        </div>

        <div className="space-y-3">
          <Skeleton className="h-8 w-2/3 rounded" />
          <Skeleton className="h-4 w-1/3 rounded" />
          <Skeleton className="h-4 w-24 rounded" />
          <div className="flex gap-2 pt-2">
            <Skeleton className="h-9 w-28 rounded-lg" />
            <Skeleton className="h-9 w-28 rounded-lg" />
          </div>
        </div>
      </div>

      {/* Tracklist */}
      <div className="mt-10 space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-4 w-5 rounded" />
            <Skeleton className="h-4 flex-1 rounded" />
            <Skeleton className="h-4 w-10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
