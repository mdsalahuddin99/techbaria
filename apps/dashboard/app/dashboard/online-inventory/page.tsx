import { inventoryService } from "@/server/services/inventoryService";
import { categoriesService } from "@/server/services/categoriesService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { InventoryClient } from "../inventory/InventoryClient";
import { StockAdjustment } from "@/shared/lib/types";

export default async function OnlineInventoryPage() {
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
      filterOnlineOnly={true}
    />
  );
}
