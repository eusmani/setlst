import { Skeleton, AlbumGridSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      <Skeleton className="mb-8 h-8 w-48 rounded" />
      <AlbumGridSkeleton count={12} />
    </div>
  );
}
