import { useRouter, useParams } from "next/navigation";
import { useStorefrontCategories } from "../../hooks/useStorefrontCategories";

interface Props {
  selected?: string | null;
}

export function CategoryFilter({ selected }: Props) {
  const categories = useStorefrontCategories();
  const router = useRouter();
  const active = selected ?? "all";

  return (
    <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0">
      <button
        onClick={() => router.push("/storefront/shop")}
        className={`shrink-0 h-9 px-4 rounded-full text-xs sm:text-sm font-medium transition ${
          active === "all" ? "bg-indigo-600 text-white" : "bg-card/5 text-slate-300 border border-white/10 hover:border-indigo-400/40"
        }`}
      >
        All
      </button>
      {categories.map((c) => (
        <button
          key={c.value}
          onClick={() => router.push(`/storefront/shop/${encodeURIComponent(c.value)}`)}
          className={`shrink-0 h-9 px-4 rounded-full text-xs sm:text-sm font-medium transition inline-flex items-center gap-1.5 ${
            active === c.value
              ? "bg-indigo-600 text-white"
              : "bg-card/5 text-slate-300 border border-white/10 hover:border-indigo-400/40"
          }`}
        >
          <c.icon className="h-3.5 w-3.5" />
          {c.label}
        </button>
      ))}
    </div>
  );
}
