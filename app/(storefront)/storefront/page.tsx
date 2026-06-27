import { LiveDealTicker } from "@/features/storefront/components/home/LiveDealTicker";
import { HeroBanner } from "@/features/storefront/components/home/HeroBanner";
import { TrustStrip } from "@/features/storefront/components/home/TrustStrip";
import { CategoryRail } from "@/features/storefront/components/home/CategoryRail";
import { FlashDealsSection } from "@/features/storefront/components/home/FlashDealsSection";
import { FeaturedProducts } from "@/features/storefront/components/home/FeaturedProducts";
import { ExpertCTA } from "@/features/storefront/components/home/ExpertCTA";
import { BrandsRow } from "@/features/storefront/components/home/BrandsRow";
import { deriveFeaturedProducts } from "@/features/storefront/hooks/useStorefrontProducts";
import { productsService } from "@/server/services/productsService";
import { categoriesService } from "@/server/services/categoriesService";
import { storefrontService } from "@/server/services/storefrontService";
import { getInternalCtx } from "@/server/lib/internalCtx";

export default async function StorefrontHome() {
  // Fetch data server-side
  const ctx = getInternalCtx();
  const products = await productsService.publicStorefrontList();
  const categories = await categoriesService.listFlat(ctx);
  const heroSlides = await storefrontService.listHeroSlides(ctx);
  const activeSlides = heroSlides.filter(s => s.isActive);
  
  const featured = deriveFeaturedProducts(products, 1);
  const heroProduct = featured[0] ?? null;

  return (
    <div className="pb-16 md:pb-0 bg-background text-foreground">
      {/* Deal ticker — homepage only */}
      <LiveDealTicker />

      {/* Hero banner */}
      <HeroBanner featured={heroProduct} slides={activeSlides} />

      {/* Trust signals — Soft Sky Blue bg */}
      <TrustStrip />

      {/* Category navigation — White bg */}
      <CategoryRail products={products} realCategories={categories} />

      {/* Flash Deals — Blue Gradient bg */}
      <FlashDealsSection products={products} />

      {/* Featured Products — White bg */}
      <FeaturedProducts products={products} />

      {/* Expert CTA — Blue→Cyan Gradient */}
      <ExpertCTA />

      {/* Brands — Light Sky Blue bg */}
      <BrandsRow />
    </div>
  );
}
