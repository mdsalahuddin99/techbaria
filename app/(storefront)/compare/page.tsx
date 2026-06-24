"use client";

import { useCompareStore } from "@/features/storefront/store/useCompareStore";
import { useProducts } from "@/features/products/hooks";
import { formatPrice } from "@/features/storefront";
import { useSeo } from "@/features/storefront";
import { GitCompareArrows, X, Check, Minus } from "lucide-react";
import Link from "next/link";

export default function StorefrontCompare() {
  useSeo({ title: "Compare · AmarShop", description: "Side-by-side product comparison" });
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const { data: all } = useProducts();
  const items = ids.map((id) => all.find((p) => p.id === id)).filter(Boolean) as typeof all;

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <GitCompareArrows className="h-12 w-12 mx-auto text-slate-600 mb-3" />
        <h1 className="text-xl font-bold">Compare খালি</h1>
        <p className="text-sm text-slate-400 mt-1">৪টি পর্যন্ত পণ্য পাশাপাশি তুলনা করুন।</p>
        <Link href="/shop" className="inline-block mt-5 px-5 h-10 leading-10 rounded-full bg-indigo-600 text-white text-sm font-semibold">
          Browse shop
        </Link>
      </div>
    );
  }

  const rows: { label: string; get: (p: typeof items[number]) => React.ReactNode }[] = [
    { label: "Price", get: (p) => <span className="text-indigo-300 font-bold">{formatPrice(p.price)}</span> },
    { label: "Brand", get: (p) => p.brand || "—" },
    { label: "Model", get: (p) => p.model || "—" },
    { label: "Category", get: (p) => p.category },
    {
      label: "Stock",
      get: (p) =>
        p.stock > 0 ? (
          <span className="inline-flex items-center gap-1 text-emerald-300"><Check className="h-3.5 w-3.5" /> {p.stock}</span>
        ) : (
          <span className="inline-flex items-center gap-1 text-rose-300"><Minus className="h-3.5 w-3.5" /> Out</span>
        ),
    },
    { label: "Warranty", get: (p) => p.warrantyMonths ? `${p.warrantyMonths} months` : "—" },
    { label: "Discount", get: (p) => p.defaultDiscount?.value ? `${p.defaultDiscount.value}${p.defaultDiscount.mode === "percent" ? "%" : "৳"}` : "—" },
  ];

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2">
          <GitCompareArrows className="h-6 w-6 text-indigo-300" /> Compare
        </h1>
        <button onClick={clear} className="text-xs text-rose-300 hover:text-rose-200">Clear all</button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-white/10 bg-card/[0.03]">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr>
              <th className="sticky left-0 bg-[#0b0b22] z-10 p-4 text-left text-xs text-slate-500 font-medium uppercase tracking-wider w-32">
                Feature
              </th>
              {items.map((p) => (
                <th key={p.id} className="p-4 text-left align-top min-w-[180px]">
                  <div className="relative rounded-xl border border-white/10 bg-card/5 p-3">
                     <button
                      onClick={() => remove(p.id)}
                      className="absolute top-1.5 right-1.5 h-6 w-6 rounded-full bg-black/40 hover:bg-rose-500/30 grid place-items-center"
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                    <div className="aspect-square rounded-lg bg-card/5 overflow-hidden grid place-items-center mb-2">
                      {p.imageUrl ? (
                        <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover" />
                      ) : (
                        <span className="text-4xl">{p.emoji || "📦"}</span>
                      )}
                    </div>
                    <Link href={`/storefront/p/${encodeURIComponent(p.id)}`} className="text-sm font-semibold text-slate-100 hover:text-indigo-300 line-clamp-2">
                      {p.name}
                    </Link>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-white/5">
                <td className="sticky left-0 bg-[#0b0b22] z-10 p-3 text-xs text-slate-400 font-medium">{row.label}</td>
                {items.map((p) => (
                  <td key={p.id} className="p-3 text-slate-200">{row.get(p)}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
