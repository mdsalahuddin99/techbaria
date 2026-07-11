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
  <div className="py-5 border-b border-border/50 last:border-b-0">
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold uppercase tracking-wide text-foreground relative after:content-[''] after:absolute after:-bottom-1.5 after:left-0 after:w-8 after:h-0.5 after:bg-primary after:rounded-full">{title}</h3>
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
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <h2 className="text-base font-extrabold uppercase text-foreground">Filters</h2>
        <button
          onClick={onReset}
          className="text-xs font-semibold text-muted-foreground hover:text-destructive inline-flex items-center gap-1 transition-colors"
        >
          <X className="h-3.5 w-3.5" /> Reset
        </button>
      </div>

      <Section title="Price range">
        <Slider
          min={bounds.min}
          max={bounds.max}
          step={Math.max(100, Math.round((bounds.max - bounds.min) / 100))}
          value={[value.priceMin, value.priceMax]}
          onValueChange={([min, max]) => onChange({ ...value, priceMin: min, priceMax: max })}
          className="my-4"
        />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-semibold text-foreground bg-secondary px-2 py-1 rounded-md">{fmt(value.priceMin)}</span>
          <span className="text-muted-foreground/50">—</span>
          <span className="font-semibold text-foreground bg-secondary px-2 py-1 rounded-md">{fmt(value.priceMax)}</span>
        </div>
      </Section>

      {brands.length > 0 && (
        <Section
          title={`Brands · ${brands.length}`}
          action={
            value.brands.length > 0 && (
              <button onClick={() => onChange({ ...value, brands: [] })} className="text-[10px] font-medium text-muted-foreground hover:text-destructive">
                Clear
              </button>
            )
          }
        >
          <div className="space-y-1.5 max-h-56 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent">
            {brands.map((b) => {
              const checked = value.brands.includes(b);
              return (
                <label
                  key={b}
                  className="flex items-center gap-2.5 py-1.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer group transition-colors"
                >
                  <span
                    className={`h-4 w-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-all ${
                      checked 
                        ? "bg-primary border-primary text-primary-foreground" 
                        : "bg-background border-border group-hover:border-primary/50"
                    }`}
                  >
                    <Check className={`h-3 w-3 transition-opacity ${checked ? "opacity-100" : "opacity-0"}`} strokeWidth={3} />
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
        <div className="space-y-2.5">
          <label className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer group transition-colors">
            <span
              className={`h-4 w-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-all ${
                value.inStockOnly 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "bg-background border-border group-hover:border-primary/50"
              }`}
            >
              <Check className={`h-3 w-3 transition-opacity ${value.inStockOnly ? "opacity-100" : "opacity-0"}`} strokeWidth={3} />
            </span>
            <input
              type="checkbox"
              checked={value.inStockOnly}
              onChange={(e) => onChange({ ...value, inStockOnly: e.target.checked })}
              className="sr-only"
            />
            In stock only
          </label>
          <label className="flex items-center gap-2.5 text-sm text-muted-foreground hover:text-foreground cursor-pointer group transition-colors">
            <span
              className={`h-4 w-4 rounded-[4px] border flex items-center justify-center shrink-0 transition-all ${
                value.onSaleOnly 
                  ? "bg-primary border-primary text-primary-foreground" 
                  : "bg-background border-border group-hover:border-primary/50"
              }`}
            >
              <Check className={`h-3 w-3 transition-opacity ${value.onSaleOnly ? "opacity-100" : "opacity-0"}`} strokeWidth={3} />
            </span>
            <input
              type="checkbox"
              checked={value.onSaleOnly}
              onChange={(e) => onChange({ ...value, onSaleOnly: e.target.checked })}
              className="sr-only"
            />
            On sale only
          </label>
        </div>
      </Section>
    </div>
  );
}
