import { prisma } from "@/server/db/client";

export const inventoryLotService = {
  /**
   * Deplete a specified quantity from FIFO lots and return the total calculated cost.
   * This modifies InventoryLot records within the provided transaction.
   * 
   * @returns Total cost of the depleted items.
   */
  async depleteLots(tx: any, productId: string, qty: number, warehouseId?: string | null): Promise<number> {
    if (qty <= 0) return 0;
    
    // Fetch available lots ordered by oldest first (FIFO)
    const lots = await tx.inventoryLot.findMany({
      where: {
        productId,
        qtyRemaining: { gt: 0 },
        ...(warehouseId ? { warehouseId } : {})
      },
      orderBy: { createdAt: "asc" }
    });
    
    let remainingToDeplete = qty;
    let totalCost = 0;
    
    for (const lot of lots) {
      if (remainingToDeplete <= 0) break;
      
      const takeQty = Math.min(lot.qtyRemaining, remainingToDeplete);
      
      // Accumulate total cost
      totalCost += takeQty * Number(lot.unitCost);
      
      // Update lot's remaining quantity
      await tx.inventoryLot.update({
        where: { id: lot.id },
        data: { qtyRemaining: lot.qtyRemaining - takeQty }
      });
      
      remainingToDeplete -= takeQty;
    }
    
    // If there's still quantity to deplete but no lots available 
    // (e.g., legacy stock before FIFO system, or overselling)
    // Fall back to the global product cost.
    if (remainingToDeplete > 0) {
      const product = await tx.product.findUnique({ where: { id: productId }, select: { cost: true } });
      totalCost += remainingToDeplete * Number(product?.cost || 0);
    }
    
    return totalCost;
  }
};
