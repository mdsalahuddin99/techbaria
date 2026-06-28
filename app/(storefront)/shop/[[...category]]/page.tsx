import { productsService } from "@/server/services/productsService";
import { ShopClient } from "@/features/storefront/components/product/ShopClient";

export const revalidate = 300; // 5 minutes ISR caching

export default async function StorefrontCatalog() {
  // Fetch the entire public storefront catalog server-side
  // Since it's public and lean, this is very fast.
  const initialProducts = await productsService.publicStorefrontList();

  return <ShopClient initialProducts={initialProducts} />;
}
