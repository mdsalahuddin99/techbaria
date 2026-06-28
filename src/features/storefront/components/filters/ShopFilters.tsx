import { useStorefrontBrands, useStorefrontCategories } from "../../hooks/useStorefrontCategories";
import { Slider } from "@/shared/ui/slider";
import { Check, X } from "lucide-react";

export interface ShopFilterState {
  category: string | null;
  brands: string[];
  priceMin: number;
  priceMax: number;
  inStockOnly: boolean;
  onSaleOnly: boolean;
}

interface Props {
  value: ShopFilterState;
  bounds: { min: number; max: number };
  onChange: (v: ShopFilterState) => void;
  onReset: () => void;
  onCategoryNav: (cat: string | null) => void;
  initialProducts?: any[];
}

const Section = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="py-5 border-b border-slate-200 last:border-b-0">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-900 relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-8 after:h-0.5 after:bg-yellow-400">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

export function ShopFilters({ value, bounds, onChange, onReset, onCategoryNav, initialProducts }: Props) {
  const categories = useStorefrontCategories({ initialData: initialProducts });
  const brands = useStorefrontBrands(value.category, { initialData: initialProducts });

  const toggleBrand = (b: string) => {
    const next = value.brands.includes(b) ? value.brands.filter((x) => x !== b) : [...value.brands, b];
    onChange({ ...value, brands: next });
  };

  const fmt = (n: number) => `৳${n.toLocaleString("en-BD")}`;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <h2 className="text-base font-extrabold uppercase text-slate-900">Filters</h2>
        <button
          onClick={onReset}
          className="text-xs font-semibold text-slate-500 hover:text-rose-600 inline-flex items-center gap-1"
        >
          <X className="h-3 w-3" /> Reset
        </button>
      </div>

      <Section title="Category">
        <div className="space-y-1">
          <button
            onClick={() => onCategoryNav(null)}
            className={`w-full flex items-center justify-between py-1.5 text-sm transition ${
              !value.category ? "text-slate-900 font-bold" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <span>All Products</span>
            {!value.category && <Check className="h-3.5 w-3.5" />}
          </button>
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => onCategoryNav(c.value)}
              className={`w-full flex items-center justify-between py-1.5 text-sm transition ${
                value.category === c.value
                  ? "text-slate-900 font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <c.icon className={`h-4 w-4 shrink-0 ${value.category === c.value ? "text-yellow-500" : "text-slate-400"}`} />
                <span className="truncate">{c.label}</span>
              </span>
              <span className="text-[10px] text-slate-500">{c.count}</span>
            </button>
          ))}
        </div>
      </Section>

      <Section title="Price range">
        <Slider
          min={bounds.min}
          max={bounds.max}
          step={Math.max(100, Math.round((bounds.max - bounds.min) / 100))}
          value={[value.priceMin, value.priceMax]}
          onValueChange={([min, max]) => onChange({ ...value, priceMin: min, priceMax: max })}
          className="my-3"
        />
        <div className="flex items-center justify-between text-xs text-slate-700">
          <span className="font-semibold text-slate-900">{fmt(value.priceMin)}</span>
          <span className="text-slate-400">—</span>
          <span className="font-semibold text-slate-900">{fmt(value.priceMax)}</span>
        </div>
      </Section>

      {brands.length > 0 && (
        <Section
          title={`Brands · ${brands.length}`}
          action={
            value.brands.length > 0 && (
              <button onClick={() => onChange({ ...value, brands: [] })} className="text-[10px] text-slate-500 hover:text-rose-600">
                Clear
              </button>
            )
          }
        >
          <div className="space-y-1 max-h-56 overflow-y-auto pr-1 -mr-1">
            {brands.map((b) => {
              const checked = value.brands.includes(b);
              return (
                <label
                  key={b}
                  className="flex items-center gap-2 py-1.5 text-sm text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  <span
                    className={`h-4 w-4 rounded-sm border grid place-items-center shrink-0 transition ${
                      checked ? "bg-yellow-400 border-yellow-400 text-slate-900" : "bg-white border-slate-300"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleBrand(b)}
                    className="sr-only"
                  />
                  <span className="truncate">{b}</span>
                </label>
              );
            })}
          </div>
        </Section>
      )}

      <Section title="Availability">
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={value.inStockOnly}
              onChange={(e) => onChange({ ...value, inStockOnly: e.target.checked })}
              className="accent-yellow-400"
            />
            In stock only
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={value.onSaleOnly}
              onChange={(e) => onChange({ ...value, onSaleOnly: e.target.checked })}
              className="accent-yellow-400"
            />
            On sale only
          </label>
        </div>
      </Section>
    </div>
  );
}
