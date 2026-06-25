"use client";

import { LiveDealTicker } from "@/features/storefront/components/home/LiveDealTicker";
import { HeroBanner } from "@/features/storefront/components/home/HeroBanner";
import { TrustStrip } from "@/features/storefront/components/home/TrustStrip";
import { CategoryRail } from "@/features/storefront/components/home/CategoryRail";
import { FlashDealsSection } from "@/features/storefront/components/home/FlashDealsSection";
import { FeaturedProducts } from "@/features/storefront/components/home/FeaturedProducts";
import { ExpertCTA } from "@/features/storefront/components/home/ExpertCTA";
import { BrandsRow } from "@/features/storefront/components/home/BrandsRow";
import { useFeaturedProducts } from "@/features/storefront";

export default function StorefrontHome() {
  const featured = useFeaturedProducts(1);
  const heroProduct = featured[0] ?? null;

  return (
    <div className="pb-16 md:pb-0" style={{ background: "#ffffff" }}>
      {/* Deal ticker — homepage only */}
      <LiveDealTicker />

      {/* Hero banner */}
      <HeroBanner featured={heroProduct} />

      {/* Trust signals — Soft Sky Blue bg */}
      <TrustStrip />

      {/* Category navigation — White bg */}
      <CategoryRail />

      {/* Flash Deals — Blue Gradient bg */}
      <FlashDealsSection />

      {/* Featured Products — White bg */}
      <FeaturedProducts />

      {/* Expert CTA — Blue→Cyan Gradient */}
      <ExpertCTA />

      {/* Brands — Light Sky Blue bg */}
      <BrandsRow />
    </div>
  );
}
