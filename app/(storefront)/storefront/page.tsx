"use client";

import { LiveDealTicker } from "@/features/storefront/components/home/LiveDealTicker";
import { HeroBanner } from "@/features/storefront/components/home/HeroBanner";
import { TrustStrip } from "@/features/storefront/components/home/TrustStrip";
import { CategoryRail } from "@/features/storefront/components/home/CategoryRail";
import { FlashDealsSection } from "@/features/storefront/components/home/FlashDealsSection";
import { FeaturedProducts } from "@/features/storefront/components/home/FeaturedProducts";
import { BrandsRow } from "@/features/storefront/components/home/BrandsRow";
import { useFeaturedProducts } from "@/features/storefront";

export default function StorefrontHome() {
  const featured = useFeaturedProducts(1);
  const heroProduct = featured[0] ?? null;

  return (
    <div className="pb-16 md:pb-0">
      {/* Deal ticker — homepage only */}
      <LiveDealTicker />

      {/* Hero banner */}
      <HeroBanner featured={heroProduct} />

      {/* Trust signals */}
      <TrustStrip />

      {/* Category navigation */}
      <CategoryRail />

      {/* Flash Deals */}
      <FlashDealsSection />

      {/* Featured Products */}
      <FeaturedProducts />

      {/* Brands */}
      <BrandsRow />

      {/* bottom spacing */}
      <div className="h-12" />
    </div>
  );
}
