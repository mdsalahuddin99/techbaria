import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, ChevronRight } from "lucide-react";
import { useFlashDeals } from "../../hooks/useStorefrontProducts";
import { formatPrice, calcDiscountPct } from "../../lib/formatPrice";
import { productDisplayName } from "@/shared/lib/format";

export function FlashDealsSection() {
  const products = useFlashDeals(6);
  const [endsIn, setEndsIn] = useState({ h: 5, m: 42, s: 18 });

  useEffect(() => {
    const t = setInterval(() => {
      setEndsIn((p) => {
        let { h, m, s } = p;
        s--;
        if (s < 0) { s = 59; m--; }
        if (m < 0) { m = 59; h--; }
        if (h < 0) { h = 0; m = 0; s = 0; }
        return { h, m, s };
      });
    }, 1000);
    return () => clearInterval(t);
  }, []);

  if (!products.length) return null;

  return (
    <section className="bg-slate-900 py-8 sm:py-12 mt-4 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/20 rounded-full blur-3xl -mr-20 -mt-20"></div>
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-rose-600/20 rounded-full blur-3xl -ml-20 -mb-20"></div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center">
              <Flame className="h-6 w-6 text-rose-500" />
            </div>
            <div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Flash Deals</h2>
              <p className="text-sm text-slate-400 mt-1">আজকের বিশেষ অফার</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-end sm:items-center gap-4">
            {/* Countdown */}
            <div className="flex items-center gap-1.5 bg-white/5 backdrop-blur-md px-3 py-1.5 rounded-lg border border-white/10">
              <span className="text-slate-300 text-xs font-medium mr-2 hidden sm:inline">শেষ হবে:</span>
            {[endsIn.h, endsIn.m, endsIn.s].map((n, i, arr) => (
              <span key={i} className="contents">
                <span className="px-2 py-1 rounded-md bg-slate-900 font-mono font-bold tabular-nums text-white text-sm">
                  {String(n).padStart(2, "0")}
                </span>
                {i < arr.length - 1 && <span className="text-slate-400 font-bold">:</span>}
              </span>
            ))}
          </div>
            <Link
              href="/shop"
              className="text-sm text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1 font-semibold transition-colors"
            >
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

      {/* Products scroll row */}
      <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-3 px-3 sm:mx-0 sm:px-0 pb-2">
        {products.map((p) => {
          const old = p.defaultDiscount?.value
            ? p.defaultDiscount.mode === "percent"
              ? Math.round(p.price / (1 - p.defaultDiscount.value / 100))
              : p.price + p.defaultDiscount.value
            : undefined;
          const off = calcDiscountPct(p.price, old);
          return (
            <Link
              key={p.id}
              href={`/p/${encodeURIComponent(p.slug || p.id)}`}
              className="group shrink-0 w-36 sm:w-44 rounded-xl bg-white shadow-sm border border-slate-100 hover:border-indigo-400 hover:shadow-lg hover:-translate-y-1.5 transition-all duration-300 overflow-hidden"
            >
              <div className="relative aspect-square bg-slate-50 grid place-items-center overflow-hidden">
                {p.imageUrl ? (
                  <img
                    src={p.imageUrl}
                    alt={productDisplayName(p)}
                    loading="lazy"
                    className="absolute inset-0 h-full w-full object-contain p-3 transition duration-500 group-hover:scale-105"
                  />
                ) : (
                  <span className="text-4xl">{p.emoji || "📦"}</span>
                )}
                {off && (
                  <span className="absolute top-2 left-2 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white shadow-sm">
                    -{off}%
                  </span>
                )}
              </div>
              <div className="p-3">
                <div className="text-[11px] sm:text-xs font-semibold text-slate-800 line-clamp-2 min-h-[2.2rem] group-hover:text-indigo-700 transition-colors">
                  {productDisplayName(p)}
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-sm font-extrabold text-indigo-600">{formatPrice(p.price)}</span>
                  {old && <span className="text-[10px] text-slate-400 line-through">{formatPrice(old)}</span>}
                </div>
              </div>
            </Link>
          );
        })}
      </div>
      </div>
    </section>
  );
}
