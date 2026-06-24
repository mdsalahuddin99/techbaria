import { useStorefrontBrands } from "../../hooks/useStorefrontCategories";

/** Brand pills row */
export function BrandsRow() {
  const brands = useStorefrontBrands();
  if (brands.length < 2) return null;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-8 border-t border-slate-100">
      <div className="flex items-center gap-3 mb-5">
        <span className="w-1.5 h-6 bg-indigo-600 rounded-full" />
        <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Top Brands</h2>
      </div>
      <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 pb-1">
        {brands.map((b) => (
          <div
            key={b}
            className="shrink-0 px-5 h-12 rounded-lg bg-white border border-slate-200 hover:border-indigo-500 hover:shadow-sm grid place-items-center text-xs sm:text-sm font-bold text-slate-700 hover:text-indigo-700 transition-colors cursor-default"
          >
            {b}
          </div>
        ))}
      </div>
    </section>
  );
}
