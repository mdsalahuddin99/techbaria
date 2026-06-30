import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import type { Ctx } from "@/server/lib/ctx";
import { create } from "./create"; // to create a PurchaseOrder

/**
 * List all restock orders
 */
export async function listRestocks(ctx: Ctx) {
  const restocks = await prisma.restockOrder.findMany({
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 50, // Limit to prevent memory spike
  });
  return { items: restocks };
}

/**
 * Auto-generate a restock draft based on low stock products
 */
export async function createRestockDraft(ctx: Ctx, note?: string) {
  const lowStockProducts = await prisma.$queryRaw<Array<{ id: string, name: string, stock: number, reorderLevel: number, cost: number }>>`
    SELECT id, name, stock, "reorderLevel", cost
    FROM "Product"
    WHERE "isPublished" = true AND stock <= "reorderLevel"
  `;

  const itemsToOrder = lowStockProducts.map(p => ({
    ...p,
    stock: Number(p.stock),
    reorderLevel: Number(p.reorderLevel),
    cost: Number(p.cost || 0),
  }));

  if (itemsToOrder.length === 0) {
    throw new ServiceError("VALIDATION", "No products are below their minimum stock level", 400);
  }

  // Generate unique RO number
  const count = await prisma.restockOrder.count();
  const roNumber = `RO-${String(count + 1).padStart(5, "0")}`;

  const restock = await prisma.restockOrder.create({
    data: {
      roNumber,
      note,
      items: {
        create: itemsToOrder.map(p => {
          const suggestedQty = Math.max(1, p.reorderLevel - p.stock + 5); 
          return {
            productId: p.id,
            name: p.name,
            currentStock: p.stock,
            minStock: p.reorderLevel,
            suggestedQty,
            costPrice: p.cost,
          };
        }),
      },
    },
    include: { items: true },
  });

  return restock;
}

/**
 * Update an item's suggested quantity in a draft
 */
export async function updateRestockItem(ctx: Ctx, id: string, productId: string, qty: number) {
  const item = await prisma.restockItem.findFirst({
    where: { restockOrderId: id, productId },
  });
  
  if (!item) {
    throw new ServiceError("NOT_FOUND", "Restock item not found", 404);
  }

  await prisma.restockItem.update({
    where: { id: item.id },
    data: { suggestedQty: qty },
  });
}

/**
 * Remove an item from a draft
 */
export async function removeRestockItem(ctx: Ctx, id: string, productId: string) {
  const item = await prisma.restockItem.findFirst({
    where: { restockOrderId: id, productId },
  });
  
  if (!item) {
    throw new ServiceError("NOT_FOUND", "Restock item not found", 404);
  }

  await prisma.restockItem.delete({
    where: { id: item.id },
  });
}

/**
 * Confirm a draft: Creates a Purchase Order
 */
export async function confirmRestock(ctx: Ctx, id: string, supplierId?: string | null) {
  const restock = await prisma.restockOrder.findUnique({
    where: { id },
    include: { items: true },
  });

  if (!restock) throw new ServiceError("NOT_FOUND", "Restock order not found", 404);
  if (restock.status === "CONFIRMED") throw new ServiceError("VALIDATION", "Already confirmed", 400);
  if (restock.items.length === 0) throw new ServiceError("VALIDATION", "No items to confirm", 400);

  // Mark as confirmed
  await prisma.restockOrder.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      confirmedAt: new Date(),
    },
  });

  // Calculate totals
  const subtotal = restock.items.reduce((sum, item) => sum + (item.suggestedQty * Number(item.costPrice)), 0);

  // Use the existing create method from purchases to create a purchase order
  await create(ctx, {
    supplierId: supplierId || undefined,
    status: "Received", // To immediately update inventory
    amountPaid: 0, // Unpaid by default
    items: restock.items.map(i => ({
      productId: i.productId,
      name: i.name,
      qty: i.suggestedQty,
      receivedQty: i.suggestedQty, // Received immediately
      costPrice: Number(i.costPrice),
    })),
    note: `Generated from Restock Draft ${restock.roNumber}`,
  } as any);
}

/**
 * Delete a restock draft
 */
export async function removeRestock(ctx: Ctx, id: string) {
  const restock = await prisma.restockOrder.findUnique({ where: { id } });
  if (!restock) throw new ServiceError("NOT_FOUND", "Restock order not found", 404);
  if (restock.status === "CONFIRMED") throw new ServiceError("VALIDATION", "Cannot delete confirmed restock", 400);

  await prisma.restockOrder.delete({ where: { id } });
}
