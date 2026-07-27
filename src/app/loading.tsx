import { Skeleton, AlbumGridSkeleton, ListRowsSkeleton } from "@/components/ui/Skeleton";

// Home is force-dynamic and fetches the session plus the activity feed, so
// without a boundary here a tap on the Home tab hung on whatever screen you
// were already looking at until the server came back. This paints immediately
// instead, and gives the bottom nav's prefetch something to warm.
export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-5 pt-5 pb-10">
      <Skeleton className="mb-5 h-7 w-40 rounded" />

      {/* Album rail */}
      <div className="mb-8">
        <Skeleton className="mb-3 h-3 w-28 rounded" />
        <AlbumGridSkeleton count={6} />
      </div>

      {/* Activity feed */}
      <Skeleton className="mb-3 h-3 w-24 rounded" />
      <ListRowsSkeleton count={5} />
    </div>
  );
}
