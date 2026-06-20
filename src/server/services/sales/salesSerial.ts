import "server-only";
import { inventoryService } from "../inventoryService";

export interface SerialItemInput {
  productId: string;
  qty: number;
  serials?: string[];
}

export const salesSerial = {
  /** Assign serials (FIFO or specified) to sale items, update statuses, set warranty dates, and sync aggregates. */
  async assignSerials(
    tx: any,
    shopId: string,
    warehouseId: string | null | undefined,
    saleItems: Array<{ id: string; productId: string; warrantyMonths?: number | null }>,
    itemsInput: SerialItemInput[]
  ): Promise<void> {
    const serialItems = itemsInput.filter((item) => {
      const saleItem = saleItems.find((si) => si.productId === item.productId);
      return saleItem && item.qty > 0;
    });
    if (serialItems.length === 0) return;

    const productQtys = serialItems.map((item) => ({
      productId: item.productId,
      qty: item.qty,
      requestedSerials: item.serials,
      saleItem: saleItems.find((si) => si.productId === item.productId)!,
    }));

    const allAvailable = await tx.serialNumber.findMany({
      where: {
        productId: { in: productQtys.map((x) => x.productId) },
        status: "IN_STOCK",
        ...(warehouseId && { warehouseId }),
      },
      orderBy: { createdAt: "asc" },
    });

    const serialResults: Array<{ saleItemId: string; serials: any[] } | null> = [];
    for (const pq of productQtys) {
      const availableForProduct = allAvailable.filter((s: any) => s.productId === pq.productId);
      
      let candidates: any[] = [];
      if (pq.requestedSerials && pq.requestedSerials.length > 0) {
        // Prioritize user selected serials
        candidates = availableForProduct.filter((s: any) => pq.requestedSerials!.includes(s.serial));
        
        // Fallback to FIFO for any missing counts
        if (candidates.length < pq.qty) {
          const missingCount = pq.qty - candidates.length;
          const selectedIds = new Set(candidates.map((c) => c.id));
          const remaining = availableForProduct.filter((s: any) => !selectedIds.has(s.id));
          candidates = [...candidates, ...remaining.slice(0, missingCount)];
        }
        candidates = candidates.slice(0, pq.qty);
      } else {
        // Fallback: strict FIFO
        candidates = availableForProduct.slice(0, pq.qty);
      }

      const ids = candidates.map((s: any) => s.id);
      if (ids.length > 0) {
        const now = new Date();
        let warrantyExpiryDate: Date | null = null;
        if (pq.saleItem.warrantyMonths && pq.saleItem.warrantyMonths > 0) {
          warrantyExpiryDate = new Date(now);
          warrantyExpiryDate.setMonth(warrantyExpiryDate.getMonth() + pq.saleItem.warrantyMonths);
        }
        await tx.serialNumber.updateMany({
          where: { id: { in: ids } },
          data: { status: "SOLD", saleItemId: pq.saleItem.id, soldAt: now, warrantyExpiryDate },
        });
        serialResults.push({ saleItemId: pq.saleItem.id, serials: candidates });
      } else {
        serialResults.push(null);
      }
    }

    // Attach serials in-memory to the objects if needed
    for (const sr of serialResults) {
      if (!sr) continue;
      const item = saleItems.find((si) => si.id === sr.saleItemId);
      if (item) (item as any).serialNumbers = sr.serials;
    }

    const soldProductIds = [...new Set(serialResults.filter(Boolean).map((sr) => {
      const item = saleItems.find((si) => si.id === sr!.saleItemId);
      return item?.productId;
    }).filter(Boolean))] as string[];
    if (soldProductIds.length > 0) {
      for (const productId of soldProductIds) {
        await inventoryService.syncStockCount(tx, warehouseId, productId);
      }
    }
  },

  /** Release serial numbers back to IN_STOCK (status reset, clear soldAt and warranty). */
  async releaseSerials(
    tx: any,
    shopId: string,
    warehouseId: string | null | undefined,
    saleItemIds: string[],
    productIds: string[]
  ): Promise<void> {
    if (saleItemIds.length === 0) return;

    await tx.serialNumber.updateMany({
      where: { saleItemId: { in: saleItemIds } },
      data: { status: "IN_STOCK", saleItemId: null, soldAt: null, warrantyExpiryDate: null },
    });

    if (productIds.length > 0) {
      for (const productId of productIds) {
        await inventoryService.syncStockCount(tx, warehouseId, productId);
      }
    }
  }
};
