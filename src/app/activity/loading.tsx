import { Skeleton, ListRowsSkeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-5 pt-5 pb-10">
      <Skeleton className="mb-6 h-8 w-36 rounded" />
      <ListRowsSkeleton count={8} />
    </div>
  );
}
