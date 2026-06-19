import { useStorefrontBrands } from "../../hooks/useStorefrontCategories";

export function BrandsRow() {
  const brands = useStorefrontBrands();
  if (brands.length < 2) return null;

  return (
    <section className="max-w-7xl mx-auto px-3 sm:px-6 pt-10 sm:pt-14">
      <h2 className="text-lg sm:text-2xl font-bold tracking-tight mb-4">Top brands</h2>
      <div className="flex gap-2 sm:gap-3 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
        {brands.map((b) => (
          <div
            key={b}
            className="shrink-0 px-4 sm:px-5 h-12 sm:h-14 rounded-xl bg-card/[0.04] border border-white/10 grid place-items-center text-xs sm:text-sm font-semibold text-slate-200 hover:border-indigo-400/40 transition"
          >
            {b}
          </div>
        ))}
      </div>
    </section>
  );
}
