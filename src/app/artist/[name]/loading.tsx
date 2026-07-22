import { Skeleton, AlbumGridSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <div className="flex items-center gap-5 mb-8">
        <Skeleton className="h-24 w-24 shrink-0 rounded-full" />
        <div className="min-w-0 flex-1 space-y-3">
          <Skeleton className="h-7 w-52 rounded" />
          <Skeleton className="h-4 w-32 rounded" />
        </div>
      </div>
      <AlbumGridSkeleton count={9} />
    </div>
  );
}
