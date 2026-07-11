import { listProductsAction } from "@/server/actions/products";
import { categoriesService } from "@/server/services/categoriesService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { ProductsClient } from "./ProductsClient";
import { Product } from "@/shared/lib/types";

export default async function ProductsPage() {
  // Fetch initial data on the server
  const productsRes = await listProductsAction();
  
  // Create a minimal context since categories service doesn't require user auth for reading
  const session = await auth();
  const ctx = buildCtx(session?.user);
  const categories = await categoriesService.listFlat(ctx);

  return (
    <ProductsClient
      initialProducts={productsRes.items as Product[]}
      initialCategories={categories}
    />
  );
}
