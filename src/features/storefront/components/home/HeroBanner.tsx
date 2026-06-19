import Link from "next/link";
import { ArrowRight, Star, BadgeCheck } from "lucide-react";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { formatPrice } from "../../lib/formatPrice";
import type { Product } from "@/features/products/types";

interface Props {
  /** Optional featured product surfaced in the hero card. */
  featured?: Product | null;
}

export function HeroBanner({ featured }: Props) {
  return (
    <section className="relative overflow-hidden border-b border-white/5">
      <div
        className="absolute inset-0 opacity-70"
        style={{
          background:
            "radial-gradient(60% 80% at 20% 30%, rgba(79,70,229,0.4), transparent 60%), radial-gradient(50% 70% at 85% 70%, rgba(30,30,90,0.7), transparent 60%)",
        }}
      />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-16 md:py-20 grid md:grid-cols-2 gap-8 items-center">
        <div>
          <Badge className="bg-indigo-500/15 text-indigo-300 border border-indigo-400/20 hover:bg-indigo-500/15 mb-3">
            নতুন লঞ্চ
          </Badge>
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-[1.05]">
            Premium tech.<br />
            <span className="bg-gradient-to-r from-indigo-300 to-indigo-500 bg-clip-text text-transparent">
              Honest prices.
            </span>
          </h1>
          <p className="mt-4 text-slate-400 text-sm sm:text-lg max-w-md">
            অরিজিনাল ব্র্যান্ডেড মোবাইল, ল্যাপটপ, CCTV ও গ্যাজেট — সারাদেশে ডেলিভারি, EMI সুবিধা।
          </p>
          <div className="mt-6 flex flex-wrap gap-2 sm:gap-3">
            <Link href="/storefront/shop">
              <Button size="lg" className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-full h-11 sm:h-12 px-5 sm:px-6 shadow-lg shadow-indigo-600/30">
                Shop Now <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
            <Link href="/storefront/shop">
              <Button size="lg" variant="ghost" className="text-slate-200 hover:bg-card/5 rounded-full h-11 sm:h-12 px-5 sm:px-6">
                Browse Catalog
              </Button>
            </Link>
          </div>
          <div className="mt-6 flex items-center gap-4 sm:gap-6 text-xs sm:text-sm text-slate-400">
            <div><span className="text-white font-semibold">10K+</span> customers</div>
            <div className="h-4 w-px bg-card/10" />
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-indigo-400 text-indigo-400" />
              <span className="text-white font-semibold">4.9</span> rating
            </div>
            <div className="h-4 w-px bg-card/10 hidden sm:block" />
            <div className="hidden sm:block">
              <BadgeCheck className="h-4 w-4 text-indigo-400 inline mr-1" /> Authorized
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-square max-w-sm sm:max-w-md mx-auto">
            <div className="absolute inset-0 rounded-[3rem] bg-gradient-to-br from-indigo-600/40 via-indigo-900/20 to-transparent blur-2xl" />
            <div className="relative h-full rounded-[2rem] sm:rounded-[2.5rem] bg-gradient-to-br from-white/[0.07] to-white/[0.02] border border-white/10 backdrop-blur-sm grid place-items-center overflow-hidden">
              {featured?.imageUrl ? (
                <img src={featured.imageUrl} alt={featured.name} className="absolute inset-0 h-full w-full object-cover" />
              ) : (
                <div className="text-[8rem] sm:text-[12rem] md:text-[14rem] leading-none drop-shadow-[0_20px_50px_rgba(79,70,229,0.4)]">
                  {featured?.emoji || "📱"}
                </div>
              )}
              {featured && (
                <Link
                  href={`/storefront/p/${encodeURIComponent(featured.id)}`}
                  className="absolute bottom-4 left-4 right-4 sm:bottom-6 sm:left-6 sm:right-6 rounded-2xl bg-black/40 backdrop-blur border border-white/10 p-3 sm:p-4 flex items-center justify-between hover:bg-black/55 transition"
                >
                  <div className="min-w-0">
                    <div className="text-[10px] sm:text-xs text-slate-400">Featured</div>
                    <div className="font-semibold text-sm sm:text-base truncate">{featured.name}</div>
                  </div>
                  <div className="text-right shrink-0 ml-2">
                    <div className="font-bold text-indigo-300 text-sm sm:text-base">{formatPrice(featured.price)}</div>
                  </div>
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
