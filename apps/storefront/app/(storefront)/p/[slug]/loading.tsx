import { ChevronRight } from "lucide-react";

export default function ProductDetailLoading() {
  return (
    <div className="bg-[#F2F4F8] min-h-screen pb-20 pt-4 sm:pt-6">
      <div className="max-w-7xl mx-auto px-3 sm:px-6">
        {/* Breadcrumbs Skeleton */}
        <nav className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 mb-4 bg-white px-4 py-2 rounded-lg shadow-sm border border-slate-100">
          <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-200" />
          <div className="h-4 w-12 bg-slate-200 rounded animate-pulse" />
          <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-200" />
          <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
        </nav>

        {/* Main Product Card Skeleton */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-4 sm:p-6 lg:p-8">
          <div className="grid md:grid-cols-[45%_1fr] gap-8 lg:gap-12">
            
            {/* Gallery Skeleton */}
            <div className="md:sticky md:top-24 self-start space-y-4">
              <div className="group relative aspect-square rounded-xl bg-slate-100 animate-pulse border border-slate-100 flex items-center justify-center overflow-hidden">
                <div className="h-24 w-24 rounded-full bg-slate-200" />
              </div>
              <div className="flex gap-3 overflow-x-auto pb-2 px-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-16 w-16 shrink-0 rounded-lg bg-slate-100 animate-pulse border-2 border-slate-50" />
                ))}
              </div>
            </div>

            {/* Info Skeleton */}
            <div className="space-y-6">
              <div className="space-y-3">
                <div className="h-8 w-3/4 bg-slate-200 rounded-md animate-pulse" />
                <div className="h-8 w-1/2 bg-slate-200 rounded-md animate-pulse" />
                
                <div className="flex flex-wrap items-center gap-3 mt-4">
                  <div className="h-6 w-24 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-6 w-24 bg-slate-200 rounded-full animate-pulse" />
                  <div className="h-6 w-32 bg-slate-200 rounded-full animate-pulse" />
                </div>
              </div>

              {/* Key Features Skeleton */}
              <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 space-y-3">
                <div className="h-5 w-32 bg-slate-200 rounded animate-pulse mb-4" />
                <div className="h-4 w-full bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-5/6 bg-slate-200 rounded animate-pulse" />
                <div className="h-4 w-4/6 bg-slate-200 rounded animate-pulse" />
              </div>

              {/* Buy Box Skeleton */}
              <div className="bg-[#F8F9FA] border border-slate-200 rounded-xl p-5 sm:p-6 space-y-5">
                <div className="space-y-2">
                  <div className="h-4 w-24 bg-slate-200 rounded animate-pulse" />
                  <div className="h-10 w-32 bg-slate-300 rounded-md animate-pulse" />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <div className="h-12 w-full sm:w-32 bg-slate-200 rounded-md animate-pulse" />
                  <div className="h-12 flex-1 bg-emerald-200/50 rounded-md animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
