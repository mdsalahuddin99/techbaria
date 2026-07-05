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
    adjustmentsRes,
    categoriesRes
  ] = await Promise.all([
    inventoryService.listAdjustments(ctx, { limit: 1000 }),
    categoriesService.listFlat(ctx),
  ]);

  return (
    <InventoryClient
      initialProducts={[]} // removed mass fetch
      initialAdjustments={adjustmentsRes.items as StockAdjustment[]}
      initialCategories={categoriesRes}
    />
  );
}
