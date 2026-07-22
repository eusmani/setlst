import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <div className="max-w-3xl mx-auto px-5 py-12">
      <Skeleton className="mb-8 h-8 w-40 rounded" />
      <div className="space-y-3">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="flex items-center gap-4">
            <Skeleton className="h-5 w-5 shrink-0 rounded" />
            <Skeleton className="h-12 w-12 shrink-0 rounded" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-1/2 rounded" />
              <Skeleton className="h-3 w-1/3 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
