import { Skeleton, ListRowsSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto px-5 pt-12 pb-12">
      <div className="space-y-3 pb-6 mb-6 border-b border-[#1f1f1f]">
        <Skeleton className="h-7 w-4/5 rounded" />
        <Skeleton className="h-4 w-32 rounded" />
        <Skeleton className="h-4 w-full rounded" />
        <Skeleton className="h-4 w-11/12 rounded" />
      </div>
      <ListRowsSkeleton count={5} />
    </div>
  );
}
