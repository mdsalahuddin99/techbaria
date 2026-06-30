import { listProductsAction } from "@/server/actions/products";
import { inventoryService } from "@/server/services/inventoryService";
import { categoriesService } from "@/server/services/categoriesService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { InventoryClient } from "./InventoryClient";
import { StockAdjustment } from "@/shared/lib/types";

export default async function InventoryPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  const [
    productsRes,
    adjustmentsRes,
    categoriesRes
  ] = await Promise.all([
    listProductsAction(undefined, { limit: 2000 }),
    inventoryService.listAdjustments(ctx, { limit: 1000 }),
    categoriesService.listFlat(ctx),
  ]);

  return (
    <InventoryClient
      initialProducts={productsRes.items}
      initialAdjustments={adjustmentsRes.items as StockAdjustment[]}
      initialCategories={categoriesRes}
    />
  );
}
