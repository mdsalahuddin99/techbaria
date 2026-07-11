import { Loader2 } from "lucide-react";

/**
 * Skeleton loading state for all admin pages.
 * Renders instantly on navigation while the page data streams in.
 * Prevents "blank screen" UX during 5+ second data fetches.
 */
export default function AdminLoading() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-8 animate-in fade-in duration-300">
      {/* Title skeleton */}
      <div className="h-8 w-48 bg-muted rounded-md shimmer" />

      {/* Card grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded-lg shimmer" />
        ))}
      </div>

      {/* Table skeleton */}
      <div className="space-y-3">
        <div className="h-10 w-full bg-muted rounded-md shimmer" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-14 w-full bg-muted/50 rounded-md shimmer" />
        ))}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.5; }
          50% { opacity: 0.8; }
          100% { opacity: 0.5; }
        }
        .shimmer {
          animation: shimmer 1.5s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
}
