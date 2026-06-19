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
}

const Section = ({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) => (
  <div className="py-4 border-b border-white/5 last:border-b-0">
    <div className="flex items-center justify-between mb-3">
      <h3 className="text-xs uppercase tracking-wider text-slate-400 font-semibold">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

export function ShopFilters({ value, bounds, onChange, onReset, onCategoryNav }: Props) {
  const categories = useStorefrontCategories();
  const brands = useStorefrontBrands();

  const toggleBrand = (b: string) => {
    const next = value.brands.includes(b) ? value.brands.filter((x) => x !== b) : [...value.brands, b];
    onChange({ ...value, brands: next });
  };

  const fmt = (n: number) => `৳${n.toLocaleString("en-BD")}`;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-sm font-bold tracking-tight text-white">Filters</h2>
        <button
          onClick={onReset}
          className="text-[11px] text-indigo-300 hover:text-indigo-200 inline-flex items-center gap-1"
        >
          <X className="h-3 w-3" /> Reset
        </button>
      </div>

      <Section title="Category">
        <div className="space-y-1">
          <button
            onClick={() => onCategoryNav(null)}
            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition ${
              !value.category ? "bg-indigo-500/15 text-indigo-200" : "text-slate-300 hover:bg-card/5"
            }`}
          >
            <span>All Products</span>
            {!value.category && <Check className="h-3.5 w-3.5" />}
          </button>
          {categories.map((c) => (
            <button
              key={c.value}
              onClick={() => onCategoryNav(c.value)}
              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-sm transition ${
                value.category === c.value
                  ? "bg-indigo-500/15 text-indigo-200"
                  : "text-slate-300 hover:bg-card/5"
              }`}
            >
              <span className="flex items-center gap-2 truncate">
                <c.icon className="h-3.5 w-3.5 text-indigo-300 shrink-0" />
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
        <div className="flex items-center justify-between text-xs text-slate-300">
          <span className="font-semibold text-white">{fmt(value.priceMin)}</span>
          <span className="text-slate-500">—</span>
          <span className="font-semibold text-white">{fmt(value.priceMax)}</span>
        </div>
      </Section>

      {brands.length > 0 && (
        <Section
          title={`Brands · ${brands.length}`}
          action={
            value.brands.length > 0 && (
              <button onClick={() => onChange({ ...value, brands: [] })} className="text-[10px] text-slate-500 hover:text-rose-300">
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
                  className="flex items-center gap-2 px-2 py-1.5 rounded-lg text-sm text-slate-300 hover:bg-card/5 cursor-pointer"
                >
                  <span
                    className={`h-4 w-4 rounded border grid place-items-center shrink-0 transition ${
                      checked ? "bg-indigo-500 border-indigo-500" : "bg-card/5 border-white/15"
                    }`}
                  >
                    {checked && <Check className="h-3 w-3 text-white" />}
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
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={value.inStockOnly}
              onChange={(e) => onChange({ ...value, inStockOnly: e.target.checked })}
              className="accent-indigo-500"
            />
            In stock only
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={value.onSaleOnly}
              onChange={(e) => onChange({ ...value, onSaleOnly: e.target.checked })}
              className="accent-indigo-500"
            />
            On sale only
          </label>
        </div>
      </Section>
    </div>
  );
}
