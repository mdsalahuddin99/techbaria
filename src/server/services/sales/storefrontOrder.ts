import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import { paginate, type PaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";
import type { Prisma } from "@prisma/client";
import { serializeStorefrontOrder } from "@/server/lib/serialize";
import { cache } from "@/lib/cache";
import { salesSerial } from "./salesSerial";

export interface StorefrontOrderCreateInput {
  items: Array<{ productId: string; qty: number }>;
  discount?: number;
  address: {
    fullName: string;
    phone: string;
    email?: string;
    address: string;
    city: string;
    area?: string;
    postcode?: string;
    notes?: string;
  };
  shippingMethod: "inside_dhaka" | "outside_dhaka" | "pickup";
  paymentMethod: "cod" | "bkash" | "nagad" | "card";
}

export type StorefrontOrderStatus = "pending" | "confirmed" | "shipped" | "delivered" | "cancelled";

const SHIPPING_RATES: Record<string, number> = {
  inside_dhaka: 70,
  outside_dhaka: 130,
  pickup: 0,
};

export const storefrontOrder = {
  /** Create a storefront order (from checkout). No auth required. */
  async createStorefrontOrder(ctx: Ctx, input: StorefrontOrderCreateInput) {
    const shipping = SHIPPING_RATES[input.shippingMethod] ?? 0;
    const discount = input.discount ?? 0;
    const now = new Date();
    const orderNo = `AS-${now.getTime().toString().slice(-6)}`;

    const result = await prisma.$transaction(async (tx) => {
      const productIds = input.items.map((i) => i.productId);
      const products: any[] = await tx.product.findMany({
        where: { id: { in: productIds } },
      });
      const productMap = new Map<string, (typeof products)[number]>(products.map((p) => [p.id, p]) as [string, (typeof products)[number]][]);
      let subtotal = 0;
      for (const item of input.items) {
        const product = productMap.get(item.productId);
        if (!product) throw new ServiceError("NOT_FOUND", `Product ${item.productId} not found`, 404);
        if (Number(product.stock) < item.qty) throw new ServiceError("STOCK", `Insufficient stock for ${product.name}`, 400);
        subtotal += Number(product.price) * item.qty;
      }

      const total = Math.max(0, subtotal + shipping - discount);

      const saleItems: Prisma.SaleItemCreateManySaleInput[] = input.items.map((item) => {
        const product = productMap.get(item.productId)!;
        return {
          productId: item.productId,
          name: product.name,
          qty: item.qty,
          price: product.price,
          cost: product.cost,
          discount: 0,
        };
      });

      const sale = await tx.sale.create({
        data: {
          channel: "STOREFRONT",
          status: "COMPLETED",
          subtotal,
          discount,
          total,
          paid: 0,
          due: total,
          data: {
            orderNo,
            storefrontStatus: "pending",
            customer: {
              fullName: input.address.fullName,
              phone: input.address.phone,
              email: input.address.email,
              address: input.address.address,
              city: input.address.city,
              area: input.address.area,
              postcode: input.address.postcode,
              notes: input.address.notes,
            },
            shipping: { method: input.shippingMethod, cost: shipping },
            paymentMethod: input.paymentMethod,
          },
          items: { createMany: { data: saleItems } },
        },
        include: { items: true },
      });

      for (const item of input.items) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { decrement: item.qty } },
        });
      }

      // Assign serials FIFO for tracked products (storefront customers don't scan)
      const trackedItems = input.items.filter((item) => {
        const product = productMap.get(item.productId);
        return product?.trackSerials === true;
      });

      if (trackedItems.length > 0) {
        await salesSerial.assignSerials(
          tx,
          "default",
          sale.warehouseId,
          sale.items,
          trackedItems.map((ti) => ({ productId: ti.productId, qty: ti.qty }))
        );
      }

      return serializeStorefrontOrder(sale);
    });

    await cache.invalidateProducts("default");

    return result;
  },

  /** List storefront orders (paginated). Requires MANAGER+. */
  async listStorefrontOrders(ctx: Ctx, params?: PaginationParams) {
    requireRole(ctx, "ADMIN");
    const result = await paginate(
      prisma.sale,
      {
        where: { channel: "STOREFRONT" },
        include: { items: true },
      },
      params,
      { orderBy: { createdAt: "desc" } },
    );
    return {
      ...result,
      items: result.items.map(serializeStorefrontOrder),
    };
  },

  /** Update storefront order status. Requires MANAGER+. */
  async updateStorefrontOrderStatus(ctx: Ctx, id: string, status: StorefrontOrderStatus) {
    requireRole(ctx, "ADMIN");
    const raw = await prisma.sale.findFirst({
      where: { id, channel: "STOREFRONT" },
      select: { data: true },
    });
    if (!raw) throw new ServiceError("NOT_FOUND", "Storefront order not found", 404);

    const current = raw.data as Record<string, unknown> | undefined ?? {};
    const updated = { ...current, storefrontStatus: status };

    const sale = await prisma.sale.update({
      where: { id },
      data: { data: updated },
      include: { items: true },
    });
    return serializeStorefrontOrder(sale);
  },

  /** Get a single storefront order by id or orderNo (public — used by storefront). */
  async getStorefrontOrder(ctx: Ctx, id: string) {
    let sale = await prisma.sale.findFirst({
      where: { id, channel: "STOREFRONT" },
      include: { items: true },
    });
    if (!sale) {
      // Fallback: look up by orderNo in the data JSON column
      const all = await prisma.sale.findMany({
        where: { channel: "STOREFRONT" },
        select: { id: true, data: true },
        take: 200,
        orderBy: { createdAt: "desc" },
      });
      const match = all.find((s) => {
        const d = s.data as Record<string, unknown> | undefined;
        return d?.orderNo === id;
      });
      if (!match) throw new ServiceError("NOT_FOUND", "Storefront order not found", 404);
      sale = await prisma.sale.findFirst({
        where: { id: match.id },
        include: { items: true },
      });
    }
    return serializeStorefrontOrder(sale as any);
  },
};
