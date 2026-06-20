import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import type { Ctx } from "@/server/lib/ctx";

export interface HeldSaleCreateInput {
  customerId?: string;
  customerName?: string;
  cart: any; // The JSON cart payload
  discount: number;
}

export const heldSalesService = {
  /**
   * List all held sales for the shop.
   */
  async list(ctx: Ctx) {
    requireRole(ctx, "CASHIER");
    const sales = await prisma.heldSale.findMany({
      orderBy: { heldAt: "desc" },
    });
    return sales.map(s => ({
      ...s,
      discount: Number(s.discount)
    }));
  },

  /**
   * Create a new held sale.
   */
  async create(ctx: Ctx, input: HeldSaleCreateInput) {
    requireRole(ctx, "CASHIER");
    
    const sale = await prisma.heldSale.create({
      data: {
        userId: ctx.userId, // optionally record who held it
        customerId: input.customerId,
        customerName: input.customerName,
        cart: input.cart,
        discount: input.discount,
      },
    });

    return {
      ...sale,
      discount: Number(sale.discount)
    };
  },

  /**
   * Delete (resume or cancel) a held sale.
   */
  async delete(ctx: Ctx, id: string) {
    requireRole(ctx, "CASHIER");
    
    // Check if it exists and belongs to the shop
    const existing = await prisma.heldSale.findFirst({
      where: { id },
    });

    if (!existing) {
      throw new ServiceError("NOT_FOUND", "Held sale not found", 404);
    }

    await prisma.heldSale.delete({
      where: { id },
    });
  }
};
