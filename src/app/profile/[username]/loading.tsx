import { Skeleton, AlbumGridSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-4xl mx-auto px-5 py-12">
      {/* Header: avatar + name/handle + stats */}
      <div className="flex items-start gap-5 pb-8 mb-8 border-b border-[#1f1f1f]">
        <Skeleton className="h-[68px] w-[68px] shrink-0 rounded-full" />
        <div className="flex-1 space-y-3 pt-1">
          <Skeleton className="h-6 w-40 rounded" />
          <Skeleton className="h-3.5 w-56 rounded" />
          <div className="flex gap-5 pt-1">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
          </div>
        </div>
      </div>
      <AlbumGridSkeleton count={12} />
    </div>
  );
}
