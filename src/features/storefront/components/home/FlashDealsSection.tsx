import { useEffect, useState } from "react";
import Link from "next/link";
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
    <section className="max-w-7xl mx-auto px-3 sm:px-6 pt-8 sm:pt-12">
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-indigo-700 p-4 sm:p-6 shadow-2xl shadow-indigo-900/40">
        <div className="flex items-center justify-between mb-4 sm:mb-5 gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-2 w-2 rounded-full bg-rose-300 animate-pulse" />
            <div className="min-w-0">
              <div className="text-sm sm:text-base font-extrabold tracking-tight">Flash Deals</div>
              <div className="text-[10px] sm:text-xs text-indigo-200/80">আজকের বিশেষ অফার</div>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] sm:text-sm">
            {[endsIn.h, endsIn.m, endsIn.s].map((n, i, arr) => (
              <span key={i} className="contents">
                <span className="px-1.5 sm:px-2 py-1 rounded-md bg-black/30 backdrop-blur-sm font-mono font-bold tabular-nums text-white">
                  {String(n).padStart(2, "0")}
                </span>
                {i < arr.length - 1 && <span className="text-indigo-200/60">:</span>}
              </span>
            ))}
          </div>
        </div>
        <div className="flex gap-3 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
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
                href={`/storefront/p/${encodeURIComponent(p.id)}`}
                className="shrink-0 w-36 sm:w-44 rounded-2xl bg-card/10 backdrop-blur-md border border-white/15 p-3 hover:bg-card/15 transition"
              >
                <div className="relative aspect-square rounded-xl bg-card/5 grid place-items-center mb-2 overflow-hidden">
                  {p.imageUrl ? (
                    <img src={p.imageUrl} alt={productDisplayName(p)} loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
                  ) : (
                    <span className="text-4xl">{p.emoji || "📦"}</span>
                  )}
                  {off && (
                    <span className="absolute top-1 left-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-rose-500 text-white">
                      -{off}%
                    </span>
                  )}
                </div>
                <div className="text-[11px] sm:text-xs font-semibold text-white line-clamp-2 min-h-[2.2rem]">
                  {productDisplayName(p)}
                </div>
                <div className="mt-1 flex items-baseline gap-1.5">
                  <span className="text-sm font-bold text-white">{formatPrice(p.price)}</span>
                  {old && <span className="text-[10px] text-indigo-200/70 line-through">{formatPrice(old)}</span>}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
