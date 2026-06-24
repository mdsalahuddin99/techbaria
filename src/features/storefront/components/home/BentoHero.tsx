import Link from "next/link";
import { ArrowRight, Star, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { formatPrice } from "../../lib/formatPrice";
import { productDisplayName } from "@/shared/lib/format";
import type { Product } from "@/features/products/types";
import { SmartSearch } from "../search/SmartSearch";

interface Props {
  featured?: Product | null;
  secondary?: Product[];
}

/**
 * Bento-hero: bold headline + smart search + featured product card +
 * mini deal tiles arranged in an Awwwards-grade asymmetric grid.
 */
export function BentoHero({ featured, secondary = [] }: Props) {
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      {/* Animated gradient mesh */}
      <div
        className="absolute inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(45% 60% at 15% 25%, rgba(79,70,229,0.45), transparent 60%), radial-gradient(40% 60% at 85% 75%, rgba(30,30,90,0.6), transparent 60%), radial-gradient(30% 40% at 60% 10%, rgba(168,85,247,0.25), transparent 60%)",
        }}
      />
      <div
        className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-3 sm:px-6 py-6 sm:py-12 md:py-16">
        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/15 border border-indigo-400/20 text-[11px] sm:text-xs text-indigo-200 backdrop-blur">
          <Sparkles className="h-3 w-3" />
          AI-powered shopping · Bangladesh
        </div>

        <h1 className="mt-3 text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tighter leading-[0.95]">
          Tomorrow's tech,
          <br />
          <span className="bg-gradient-to-r from-indigo-300 via-violet-300 to-indigo-500 bg-clip-text text-transparent">
            delivered today.
          </span>
        </h1>
        <p className="mt-3 sm:mt-4 text-slate-400 text-sm sm:text-base max-w-xl">
          ১০,০০০+ অরিজিনাল প্রোডাক্ট · ২৪ ঘণ্টা ঢাকা ডেলিভারি · 0% EMI · নিশ্চিত warranty
        </p>

        {/* Hero search */}
        <div className="mt-5 sm:mt-7 max-w-2xl">
          <SmartSearch variant="hero" />
          <div className="mt-3 flex flex-wrap gap-1.5 text-[11px] sm:text-xs">
            <span className="text-slate-500">Popular:</span>
            {["iPhone 15", "MacBook Air", "RTX 4090", "Hikvision", "Sony WH-1000XM5"].map((t) => (
              <Link
                key={t}
                href={`/search?q=${encodeURIComponent(t)}`}
                className="px-2 py-0.5 rounded-full bg-card/5 border border-white/10 text-slate-300 hover:border-indigo-400/40 hover:text-indigo-200 transition"
              >
                {t}
              </Link>
            ))}
          </div>
        </div>

        {/* Bento grid */}
        <div className="mt-8 sm:mt-12 grid grid-cols-6 grid-rows-2 gap-2 sm:gap-3 min-h-[320px] sm:min-h-[420px]">
          {/* Big featured */}
          <Link
            href={featured ? `/p/${encodeURIComponent(featured.slug || featured.id)}` : "/shop"}
            className="col-span-6 md:col-span-3 row-span-2 group relative rounded-3xl overflow-hidden border border-white/10 bg-gradient-to-br from-indigo-900/40 via-indigo-950/20 to-transparent hover:border-indigo-400/50 transition"
          >
            <div className="absolute inset-0">
              {featured?.imageUrl ? (
                <img
                  src={featured.imageUrl}
                  alt={featured.name}
                  className="h-full w-full object-cover opacity-90 group-hover:scale-105 transition duration-700"
                />
              ) : (
                <div className="h-full w-full grid place-items-center text-[12rem] opacity-80">
                  {featured?.emoji || "📱"}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#020617] via-[#020617]/40 to-transparent" />
            </div>
            <div className="absolute top-4 left-4 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-card/10 backdrop-blur border border-white/20 text-[10px] sm:text-xs font-semibold">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" /> Editor's pick
            </div>
            <div className="absolute bottom-4 left-4 right-4">
              <div className="text-[10px] sm:text-xs text-indigo-300 mb-1">{featured?.category ?? "Featured"}</div>
              <div className="text-lg sm:text-2xl md:text-3xl font-bold tracking-tight line-clamp-2">
                {featured?.name ?? "Discover premium tech"}
              </div>
              <div className="mt-2 flex items-center justify-between">
                <div className="text-xl sm:text-3xl font-extrabold text-indigo-200">
                  {featured ? formatPrice(featured.price) : ""}
                </div>
                <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-indigo-600 text-white text-xs sm:text-sm font-semibold group-hover:bg-indigo-500 transition">
                  Shop <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </div>
          </Link>

          {/* Two secondary tiles */}
          {[0, 1].map((i) => {
            const p = secondary[i];
            return (
              <Link
                key={i}
                href={p ? `/p/${encodeURIComponent(p.slug || p.id)}` : "/shop"}
                className="col-span-3 md:col-span-2 row-span-1 group relative rounded-3xl overflow-hidden border border-white/10 bg-card/[0.04] hover:border-indigo-400/40 transition"
              >
                <div className="absolute inset-0 grid place-items-center overflow-hidden">
                  {p?.imageUrl ? (
                    <img src={p.imageUrl} alt={productDisplayName(p)} className="h-full w-full object-cover group-hover:scale-105 transition duration-500" />
                  ) : (
                    <span className="text-5xl">{p?.emoji ?? "💎"}</span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
                </div>
                <div className="absolute bottom-3 left-3 right-3">
                  <div className="text-[10px] text-indigo-300">{p?.category ?? "Hot"}</div>
                  <div className="text-xs sm:text-sm font-semibold truncate">{p?.name ?? "Trending now"}</div>
                  {p && <div className="text-sm font-bold text-indigo-200 mt-0.5">{formatPrice(p.price)}</div>}
                </div>
              </Link>
            );
          })}

          {/* Trust tile */}
          <div className="col-span-3 md:col-span-1 row-span-1 rounded-3xl border border-indigo-400/30 bg-gradient-to-br from-indigo-600/30 to-indigo-900/10 p-4 flex flex-col justify-between">
            <ShieldCheck className="h-6 w-6 text-indigo-200" />
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">100% Original</div>
              <div className="text-[10px] sm:text-xs text-indigo-200/80">Official warranty</div>
            </div>
          </div>

          {/* Speed tile */}
          <div className="col-span-3 md:col-span-1 row-span-1 rounded-3xl border border-violet-400/30 bg-gradient-to-br from-violet-600/30 to-fuchsia-900/10 p-4 flex flex-col justify-between">
            <Zap className="h-6 w-6 text-violet-200" />
            <div>
              <div className="text-xs sm:text-sm font-bold text-white">Fast Delivery</div>
              <div className="text-[10px] sm:text-xs text-violet-200/80">24h ঢাকা</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
