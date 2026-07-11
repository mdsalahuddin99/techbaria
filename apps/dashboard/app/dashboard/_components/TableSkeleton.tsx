import { Skeleton } from "@/shared/ui/skeleton";
import { Card } from "@/shared/ui/card";

/**
 * Reusable skeleton for dashboard table pages.
 */
export function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>
      <Card>
        <div className="divide-y">
          {Array.from({ length: rows }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-8 w-8 rounded-full" />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
