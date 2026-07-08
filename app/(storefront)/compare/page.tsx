"use client";

import { useCompareStore } from "@/features/storefront/store/useCompareStore";
import { useStorefrontProducts } from "@/features/storefront/hooks/useStorefrontProducts";
import { formatPrice } from "@/features/storefront";
import { useSeo } from "@/features/storefront";
import { GitCompareArrows, X, Check, Minus, ShoppingCart, Trash2, ArrowRight, Info, ShieldCheck, Tag, Box } from "lucide-react";
import Link from "next/link";
import { useCartStore } from "@/features/storefront/store/useCartStore";
import { toast } from "sonner";

export default function StorefrontCompare() {
  useSeo({ title: "Compare · AmarShop", description: "Side-by-side product comparison" });
  const ids = useCompareStore((s) => s.ids);
  const remove = useCompareStore((s) => s.remove);
  const clear = useCompareStore((s) => s.clear);
  const { all } = useStorefrontProducts({ enabled: ids.length > 0 });
  const items = ids.map((id) => all.find((p) => p.id === id)).filter(Boolean) as typeof all;
  const addToCart = useCartStore((s) => s.add);

  if (items.length === 0) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4 bg-slate-50/50">
        <div className="max-w-md w-full mx-auto text-center bg-white p-10 rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100">
          <div className="relative mx-auto w-24 h-24 mb-6">
            <div className="absolute inset-0 bg-indigo-500/10 rounded-full blur-xl animate-pulse" />
            <div className="relative h-full w-full bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center border border-indigo-100 shadow-inner">
              <GitCompareArrows className="h-10 w-10" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 mb-2 tracking-tight">Compare is Empty</h1>
          <p className="text-sm text-slate-500 mb-8 leading-relaxed">
            Add up to 4 products to compare their features, prices, and specifications side-by-side.
          </p>
          <Link 
            href="/shop" 
            className="inline-flex items-center justify-center h-12 px-8 rounded-full bg-slate-900 hover:bg-indigo-600 text-white font-bold transition-all shadow-lg shadow-slate-900/20 hover:shadow-indigo-600/25 group"
          >
            Browse Products <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    );
  }

  const rows: { 
    label: string; 
    icon: React.ElementType; 
    get: (p: typeof items[number]) => React.ReactNode 
  }[] = [
    { 
      label: "Price", 
      icon: Tag,
      get: (p) => <span className="text-indigo-600 font-extrabold text-lg">{formatPrice(p.price)}</span> 
    },
    { 
      label: "Brand", 
      icon: Info,
      get: (p) => <span className="font-semibold text-slate-700">{p.brand || "—"}</span> 
    },
    { 
      label: "Model", 
      icon: Box,
      get: (p) => p.model || "—" 
    },
    { 
      label: "Category", 
      icon: Tag,
      get: (p) => <span className="inline-flex px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider">{p.category}</span>
    },
    {
      label: "Stock Status",
      icon: Box,
      get: (p) =>
        p.stock > 0 ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
            <Check className="h-3.5 w-3.5" /> In Stock ({p.stock})
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-bold border border-rose-200">
            <Minus className="h-3.5 w-3.5" /> Out of Stock
          </span>
        ),
    },
    { 
      label: "Warranty", 
      icon: ShieldCheck,
      get: (p) => p.warrantyMonths ? (
        <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
          {p.warrantyMonths} Months
        </span>
      ) : "—" 
    },
    { 
      label: "Discount", 
      icon: Tag,
      get: (p) => p.defaultDiscount?.value ? (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-sm font-bold border border-amber-200/50">
          {p.defaultDiscount.value}{p.defaultDiscount.mode === "percent" ? "%" : "৳"} OFF
        </span>
      ) : "—" 
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50/50 pb-20">
      {/* Premium Header */}
      <div className="bg-white border-b border-slate-200/60 sticky top-0 md:top-[64px] z-30 shadow-sm backdrop-blur-xl bg-white/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight flex items-center gap-2.5 text-slate-900">
              <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                <GitCompareArrows className="h-6 w-6" />
              </div>
              Compare Products
            </h1>
          </div>
          <button 
            onClick={clear} 
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-rose-600 hover:bg-rose-50 hover:text-rose-700 transition-colors border border-transparent hover:border-rose-200"
          >
            <Trash2 className="h-4 w-4" /> <span className="hidden sm:inline">Clear All</span>
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="bg-white rounded-3xl border border-slate-200/60 shadow-xl shadow-slate-200/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[800px] border-collapse">
              <thead>
                <tr>
                  <th className="sticky left-0 bg-white/95 backdrop-blur-sm z-20 p-6 text-left w-56 border-b border-slate-200/80 shadow-[4px_0_12px_rgba(0,0,0,0.03)] align-bottom">
                    <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Features</div>
                  </th>
                  {items.map((p) => (
                    <th key={p.id} className="p-6 text-left align-top min-w-[260px] border-b border-slate-200/80 border-l border-slate-100">
                      <div className="relative group h-full flex flex-col">
                        <button
                          onClick={() => remove(p.id)}
                          className="absolute -top-3 -right-3 h-8 w-8 rounded-full bg-white shadow-md border border-slate-200 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-200 transition-all z-10 opacity-0 group-hover:opacity-100"
                          aria-label="Remove"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        
                        <Link href={`/storefront/p/${encodeURIComponent(p.id)}`} className="block aspect-square rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden relative mb-4 group-hover:shadow-md transition-all">
                          {p.imageUrl ? (
                            <img src={p.imageUrl} alt={p.name} className="h-full w-full object-cover mix-blend-multiply group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="absolute inset-0 grid place-items-center text-6xl bg-gradient-to-br from-slate-50 to-slate-100">
                              {p.emoji || "📦"}
                            </div>
                          )}
                        </Link>
                        
                        <Link href={`/storefront/p/${encodeURIComponent(p.id)}`} className="block text-base font-bold text-slate-900 hover:text-indigo-600 line-clamp-2 leading-tight mb-2 min-h-[40px]">
                          {p.name}
                        </Link>
                        
                        <div className="flex items-center justify-between mt-auto pt-4">
                          <span className="text-lg font-black text-indigo-600">{formatPrice(p.price)}</span>
                          <button
                            onClick={() => {
                              if (p.stock <= 0) return;
                              addToCart({
                                productId: p.id,
                                name: p.name,
                                price: p.price,
                                emoji: p.emoji,
                                imageUrl: p.imageUrl,
                                maxStock: p.stock,
                                qty: 1
                              });
                              toast.success("Added to cart");
                            }}
                            disabled={p.stock <= 0}
                            className="h-9 w-9 rounded-full bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 hover:shadow-lg hover:shadow-indigo-600/30 transition-all disabled:opacity-50 disabled:hover:bg-slate-900 disabled:hover:shadow-none shrink-0"
                            aria-label="Add to cart"
                          >
                            <ShoppingCart className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => {
                  const Icon = row.icon;
                  return (
                    <tr key={row.label} className={idx % 2 === 0 ? "bg-slate-50/50" : "bg-white"}>
                      <td className="sticky left-0 bg-inherit z-10 p-5 border-r border-slate-100 shadow-[4px_0_12px_rgba(0,0,0,0.02)]">
                        <div className="flex items-center gap-2.5 text-sm font-bold text-slate-700">
                          <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-200/60 text-slate-500">
                            <Icon className="h-4 w-4" />
                          </div>
                          {row.label}
                        </div>
                      </td>
                      {items.map((p) => (
                        <td key={p.id} className="p-5 text-sm text-slate-600 border-l border-slate-100 align-middle">
                          {row.get(p)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
