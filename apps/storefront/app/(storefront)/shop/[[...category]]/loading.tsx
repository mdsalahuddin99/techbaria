import { Loader2 } from "lucide-react";

export default function ShopLoading() {
  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-10 pb-20">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar Skeleton */}
        <div className="hidden md:block w-64 space-y-6">
          <div className="h-6 w-32 bg-slate-200 animate-pulse rounded"></div>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-4 w-full bg-slate-100 animate-pulse rounded"></div>
            ))}
          </div>
          <div className="h-6 w-24 bg-slate-200 animate-pulse rounded mt-8"></div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-4 w-3/4 bg-slate-100 animate-pulse rounded"></div>
            ))}
          </div>
        </div>

        {/* Product Grid Skeleton */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-6">
            <div className="h-6 w-48 bg-slate-200 animate-pulse rounded"></div>
            <div className="h-10 w-32 bg-slate-200 animate-pulse rounded"></div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
              <div key={i} className="bg-white border border-slate-100 rounded-lg p-3">
                <div className="aspect-square bg-slate-100 animate-pulse rounded-md mb-3 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 text-slate-300 animate-spin" />
                </div>
                <div className="h-4 w-3/4 bg-slate-200 animate-pulse rounded mb-2"></div>
                <div className="h-3 w-1/2 bg-slate-100 animate-pulse rounded mb-3"></div>
                <div className="h-5 w-1/3 bg-slate-200 animate-pulse rounded"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
