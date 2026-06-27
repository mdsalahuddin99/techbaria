"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Flame, ChevronRight, Zap } from "lucide-react";
import { deriveFlashDeals } from "../../hooks/useStorefrontProducts";
import { formatPrice, calcDiscountPct } from "../../lib/formatPrice";
import { productDisplayName } from "@/shared/lib/format";
import type { StorefrontProduct } from "@/features/storefront/types";

interface Props {
  products: StorefrontProduct[];
}

export function FlashDealsSection({ products: allProducts }: Props) {
  const products = deriveFlashDeals(allProducts, 6);
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
    <section
      className="relative overflow-hidden py-12 sm:py-16"
      style={{ background: "linear-gradient(135deg, #1D4ED8 0%, #2563EB 60%, #1E40AF 100%)" }}
    >
      {/* Decorative blobs */}
      <div
        className="absolute top-0 right-0 w-80 h-80 rounded-full pointer-events-none opacity-15"
        style={{
          background: "radial-gradient(circle, #06B6D4 0%, transparent 70%)",
          transform: "translate(30%, -30%)",
        }}
      />
      <div
        className="absolute bottom-0 left-0 w-64 h-64 rounded-full pointer-events-none opacity-10"
        style={{
          background: "radial-gradient(circle, #DBEAFE 0%, transparent 70%)",
          transform: "translate(-30%, 30%)",
        }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-96 h-96 rounded-full pointer-events-none opacity-5 -translate-x-1/2 -translate-y-1/2"
        style={{ background: "radial-gradient(circle, #ffffff 0%, transparent 70%)" }}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 relative z-10">
        {/* Section header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 sm:mb-10">
          <div className="flex items-center gap-4">
            {/* Flame icon box */}
            <div
              className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl flex items-center justify-center shrink-0"
              style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.25)" }}
            >
              <Flame className="h-6 w-6 sm:h-7 sm:w-7 text-[#F97316]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                  Flash Deals
                </h2>
                <span
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold text-white"
                  style={{ background: "#F97316" }}
                >
                  <Zap className="h-3 w-3" /> LIVE
                </span>
              </div>
              <p className="text-sm text-white/70">আজকের বিশেষ অফার — সীমিত সময়ের জন্য</p>
            </div>
          </div>

          <div className="flex flex-row sm:flex-col items-center sm:items-end gap-4 sm:gap-2">
            {/* Countdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-white/70 text-xs font-semibold hidden sm:block mr-1">শেষ হবে:</span>
              {[endsIn.h, endsIn.m, endsIn.s].map((n, i, arr) => (
                <span key={i} className="contents">
                  <span className="sf-timer-seg">{String(n).padStart(2, "0")}</span>
                  {i < arr.length - 1 && (
                    <span className="text-white/60 font-bold text-xl">:</span>
                  )}
                </span>
              ))}
            </div>
            <Link
              href="/shop"
              className="text-sm text-white/80 hover:text-white inline-flex items-center gap-1 font-semibold transition-colors"
            >
              View All <ChevronRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Products scroll row */}
        <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-2">
          {products.map((p, i) => {
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
                className="group shrink-0 w-40 sm:w-48 flex flex-col rounded-[20px] bg-white overflow-hidden transition-all duration-300 hover:-translate-y-2 sf-animate-slide-up"
                style={{
                  boxShadow: "0 4px 20px rgba(0,0,0,0.12)",
                  animationDelay: `${i * 0.08}s`,
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.boxShadow = "0 16px 40px rgba(0,0,0,0.2)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.boxShadow = "0 4px 20px rgba(0,0,0,0.12)")
                }
              >
                {/* Image area */}
                <div
                  className="relative w-full aspect-square overflow-hidden"
                  style={{ background: "#EFF6FF" }}
                >
                  {p.imageUrl ? (
                    <img
                      src={p.imageUrl}
                      alt={productDisplayName(p)}
                      loading="lazy"
                      className="absolute inset-0 h-full w-full object-contain p-3 transition-transform duration-500 group-hover:scale-110"
                    />
                  ) : (
                    <span className="absolute inset-0 grid place-items-center text-4xl transition-transform duration-500 group-hover:scale-110">
                      {p.emoji || "📦"}
                    </span>
                  )}
                  {/* Discount badge */}
                  {off && (
                    <span className="absolute top-2 left-2 sf-badge-offer">-{off}%</span>
                  )}
                </div>

                {/* Info */}
                <div className="p-3 flex flex-col gap-2">
                  <div
                    className="text-[11px] sm:text-xs font-bold line-clamp-2 min-h-[2.2rem] leading-tight transition-colors duration-200 group-hover:text-[#2563EB]"
                    style={{ color: "#1E3A5F" }}
                  >
                    {productDisplayName(p)}
                  </div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-sm font-extrabold" style={{ color: "#2563EB" }}>
                      {formatPrice(p.price)}
                    </span>
                    {old && (
                      <span className="text-[10px] line-through" style={{ color: "#94A3B8" }}>
                        {formatPrice(old)}
                      </span>
                    )}
                  </div>
                  <div
                    className="sf-btn-cart text-[11px] py-2"
                    style={{ fontSize: "11px", padding: "7px 12px" }}
                  >
                    Add to Cart
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
