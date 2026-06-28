import { X } from "lucide-react";
import type { ShopFilterState } from "./ShopFilters";

interface Props {
  value: ShopFilterState;
  bounds: { min: number; max: number };
  onChange: (v: ShopFilterState) => void;
}

export function ActiveFilterChips({ value, bounds, onChange }: Props) {
  const chips: { label: string; clear: () => void }[] = [];

  if (value.category) {
    chips.push({ label: value.category, clear: () => onChange({ ...value, category: null }) });
  }
  value.brands.forEach((b) =>
    chips.push({
      label: b,
      clear: () => onChange({ ...value, brands: value.brands.filter((x) => x !== b) }),
    }),
  );
  if (value.priceMin > bounds.min || value.priceMax < bounds.max) {
    chips.push({
      label: `৳${value.priceMin.toLocaleString("en-BD")} — ৳${value.priceMax.toLocaleString("en-BD")}`,
      clear: () => onChange({ ...value, priceMin: bounds.min, priceMax: bounds.max }),
    });
  }
  if (value.inStockOnly) chips.push({ label: "In stock", clear: () => onChange({ ...value, inStockOnly: false }) });
  if (value.onSaleOnly) chips.push({ label: "On sale", clear: () => onChange({ ...value, onSaleOnly: false }) });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <button
          key={c.label}
          onClick={c.clear}
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-50 border border-green-200 text-xs font-medium text-green-700 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 transition-colors shadow-sm"
        >
          {c.label}
          <X className="h-3 w-3" />
        </button>
      ))}
    </div>
  );
}
