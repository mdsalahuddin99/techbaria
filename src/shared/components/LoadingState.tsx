import { Skeleton } from "@/shared/ui/skeleton";
import { Loader2 } from "lucide-react";

interface LoadingStateProps {
  rows?: number;
  variant?: "table" | "cards" | "spinner" | "page";
  label?: string;
}

/**
 * Standardized loading placeholders for routes, tables and grids.
 */
export function LoadingState({ rows = 6, variant = "table", label }: LoadingStateProps) {
  if (variant === "spinner") {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        <span className="text-sm">{label ?? "Loading..."}</span>
      </div>
    );
  }

  if (variant === "page") {
    return (
      <div className="space-y-4 p-2">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/2" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-64 w-full rounded-lg mt-4" />
      </div>
    );
  }

  if (variant === "cards") {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-10 w-full" />
      ))}
    </div>
  );
}
