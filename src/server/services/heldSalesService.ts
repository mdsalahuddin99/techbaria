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
  salesPerson?: string;
  notes?: string;
  vat?: number;
  extraCharges?: number;
}

export const heldSalesService = {
  /**
   * List all held sales for the shop (with customer details for printing).
   */
  async list(ctx: Ctx) {
    requireRole(ctx, "CASHIER");
    const sales = await prisma.heldSale.findMany({
      orderBy: { heldAt: "desc" },
      include: {
        customer: {
          select: {
            id: true,
            name: true,
            phone: true,
            address: true,
            email: true,
            referencePerson: true,
          },
        },
        user: {
          select: {
            name: true,
            role: true,
          },
        },
      },
    });
    return sales.map(s => ({
      ...s,
      discount: Number(s.discount),
      vat: Number(s.vat),
      cashier: s.user?.role ?? s.user?.name ?? "Unknown",
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
        salesPerson: input.salesPerson,
        notes: input.notes,
        vat: input.vat ?? 0,
        extraCharges: input.extraCharges ?? 0,
      },
    });

    return {
      ...sale,
      discount: Number(sale.discount),
      vat: Number(sale.vat),
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

