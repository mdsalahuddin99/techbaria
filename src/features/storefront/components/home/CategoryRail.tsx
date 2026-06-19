import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { useStorefrontCategories } from "../../hooks/useStorefrontCategories";

export function CategoryRail() {
  const categories = useStorefrontCategories();
  if (!categories.length) return null;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 pt-8 sm:pt-12">
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-lg sm:text-2xl font-bold tracking-tight">Shop by category</h2>
        <Link href="/storefront/shop" className="text-xs sm:text-sm text-indigo-300 inline-flex items-center gap-1">
          All <ChevronRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3">
        {categories.slice(0, 6).map((c) => (
          <Link
            key={c.value}
            href={`/storefront/shop/${encodeURIComponent(c.value)}`}
            className={`group relative aspect-square sm:aspect-[4/5] rounded-2xl border border-white/10 bg-gradient-to-br ${c.color} p-2 sm:p-3 flex flex-col items-start justify-between overflow-hidden hover:border-indigo-400/40 transition`}
          >
            <c.icon className="h-5 w-5 sm:h-6 sm:w-6 text-white/90" />
            <div className="text-left">
              <div className="text-xs sm:text-sm font-semibold">{c.label}</div>
              <div className="text-[10px] sm:text-xs text-slate-300/80">{c.count} items</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
