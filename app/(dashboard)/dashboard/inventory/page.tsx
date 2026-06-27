import { listProductsAction } from "@/server/actions/products";
import { inventoryService } from "@/server/services/inventoryService";
import { categoriesService } from "@/server/services/categoriesService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { InventoryClient } from "./InventoryClient";

export default async function InventoryPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user as any);
  
  const [
    productsRes,
    adjustmentsRes,
    categoriesRes
  ] = await Promise.all([
    listProductsAction(),
    inventoryService.listAdjustments(ctx, { limit: 1000 }),
    categoriesService.listFlat(ctx),
  ]);

  return (
    <InventoryClient
      initialProducts={productsRes.items as any}
      initialAdjustments={adjustmentsRes.items as any}
      initialCategories={categoriesRes as any}
    />
  );
}
