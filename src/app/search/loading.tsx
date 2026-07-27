import { Skeleton, AlbumGridSkeleton } from "@/components/ui/Skeleton";

// The Albums tab had no loading boundary, so tapping it sat on the previous
// screen until the route responded — the tab felt slow even though the page
// itself renders instantly. A fallback also gives Next something to prefetch
// from the always-visible bottom nav.
export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-5 pt-5 pb-10">
      <Skeleton className="mb-5 h-11 w-full rounded-xl" />
      <div className="mb-6 flex gap-2">
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-8 w-24 rounded-full" />
        <Skeleton className="h-8 w-16 rounded-full" />
      </div>
      <AlbumGridSkeleton count={9} />
    </div>
  );
}
