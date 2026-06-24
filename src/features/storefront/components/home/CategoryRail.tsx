import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useStorefrontCategories } from "../../hooks/useStorefrontCategories";

export function CategoryRail() {
  const categories = useStorefrontCategories();
  if (!categories.length) return null;

  return (
    <section className="border-b border-slate-200/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        {/* Section header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <span className="w-2 h-8 bg-gradient-to-b from-indigo-500 to-indigo-600 rounded-full shadow-sm" />
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">Shop by Category</h2>
          </div>
          <Link
            href="/shop"
            className="text-sm font-bold text-indigo-600 hover:text-indigo-800 inline-flex items-center gap-1 transition-colors"
          >
            View All <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Category grid - Circular design matching the image */}
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-4 sm:gap-6">
          {categories.slice(0, 8).map((c) => (
            <Link
              key={c.value}
              href={`/shop/${encodeURIComponent(c.value)}`}
              className="group flex flex-col items-center gap-3"
            >
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 group-hover:border-indigo-300 group-hover:shadow-[0_8px_30px_rgb(79,70,229,0.2)] group-hover:-translate-y-2 transition-all duration-300 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <c.icon className="h-8 w-8 sm:h-10 sm:w-10 text-slate-600 group-hover:text-indigo-600 relative z-10 transition-colors" />
              </div>
              <div className="text-center">
                <div className="text-sm font-semibold text-slate-800 group-hover:text-indigo-700 transition-colors">{c.label}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{c.count} items</div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
