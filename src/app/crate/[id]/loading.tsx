import { Skeleton, AlbumGridSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-12">
      <div className="mb-8 space-y-3">
        <Skeleton className="h-8 w-56 rounded" />
        <Skeleton className="h-4 w-72 rounded" />
      </div>
      <AlbumGridSkeleton count={8} />
    </div>
  );
}
