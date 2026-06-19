/**
 * Suppliers service — Prisma-backed, framework-agnostic.
 *
 * Scoped by `ctx.shopId` (multi-tenant).
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import { paginate, type PaginationParams, type Paginated } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "./auditLogService";
import { cache } from "@/lib/cache";

export interface SupplierCreateInput {
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
}

export interface SupplierUpdateInput {
  name?: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  payable?: number;
}

export const suppliersService = {
  /** List all suppliers for the shop (paginated). */
  async list(ctx: Ctx, params?: PaginationParams) {
    const raw = await paginate<any>(
      prisma.supplier,
      {
        where: { shopId: ctx.shopId },
        include: { purchases: { select: { total: true } } },
      },
      params,
      { orderBy: { name: "asc" as const } },
    );

    return {
      ...raw,
      items: raw.items.map((s: any) => {
        const totalPurchased = s.purchases?.reduce((sum: number, p: any) => sum + Number(p.total), 0) ?? 0;
        return {
          id: s.id,
          name: s.name,
          contactPerson: s.contactPerson || "",
          phone: s.phone || "",
          email: s.email || "",
          address: s.address || "",
          notes: s.notes || "",
          payableBalance: Number(s.payable),
          totalPurchased,
          createdAt: s.createdAt.toISOString(),
        };
      }),
    };
  },

  /** Get a single supplier by ID. */
  async getById(ctx: Ctx, id: string) {
    const s = await prisma.supplier.findFirst({
      where: { id, shopId: ctx.shopId },
      include: {
        purchases: {
          select: { total: true },
        },
      },
    });

    if (!s) throw new ServiceError("NOT_FOUND", "Supplier not found", 404);

    const totalPurchased = s.purchases.reduce((sum, p) => sum + Number(p.total), 0);

    return {
      id: s.id,
      name: s.name,
      contactPerson: s.contactPerson || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      notes: s.notes || "",
      payableBalance: Number(s.payable),
      totalPurchased,
      createdAt: s.createdAt.toISOString(),
    };
  },

  /** Create a new supplier. Requires MANAGER+. */
  async create(ctx: Ctx, input: SupplierCreateInput) {
    requireRole(ctx, "MANAGER");

    if (!input.name?.trim()) {
      throw new ServiceError("VALIDATION", "Supplier name is required", 400);
    }

    const s = await prisma.supplier.create({
      data: {
        shopId: ctx.shopId,
        name: input.name,
        contactPerson: input.contactPerson || null,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        notes: input.notes || null,
        payable: 0,
      },
    });

    return {
      id: s.id,
      name: s.name,
      contactPerson: s.contactPerson || "",
      phone: s.phone || "",
      email: s.email || "",
      address: s.address || "",
      notes: s.notes || "",
      payableBalance: Number(s.payable),
      totalPurchased: 0,
      createdAt: s.createdAt.toISOString(),
    };
  },

  /** Update an existing supplier. Requires MANAGER+. */
  async update(ctx: Ctx, id: string, input: SupplierUpdateInput) {
    requireRole(ctx, "MANAGER");

    const updated = await prisma.supplier.updateMany({
      where: { id, shopId: ctx.shopId },
      data: {
        ...(input.name !== undefined && { name: input.name }),
        ...(input.contactPerson !== undefined && { contactPerson: input.contactPerson || null }),
        ...(input.phone !== undefined && { phone: input.phone || null }),
        ...(input.email !== undefined && { email: input.email || null }),
        ...(input.address !== undefined && { address: input.address || null }),
        ...(input.notes !== undefined && { notes: input.notes || null }),
        ...(input.payable !== undefined && { payable: input.payable }),
      },
    });

    if (updated.count === 0) {
      throw new ServiceError("NOT_FOUND", "Supplier not found", 404);
    }

    await auditLogService.log(ctx, {
      entity: "Supplier",
      entityId: id,
      action: "UPDATE",
      diff: input as unknown as Record<string, unknown>,
    });

    return suppliersService.getById(ctx, id);
  },

  /** Get supplier profile (aggregated summary). Requires MANAGER+. */
  async getProfile(ctx: Ctx, id: string) {
    requireRole(ctx, "MANAGER");
    const s = await prisma.supplier.findFirst({
      where: { id, shopId: ctx.shopId },
    });
    if (!s) throw new ServiceError("NOT_FOUND", "Supplier not found", 404);

    const recentPurchases = await prisma.purchase.findMany({
      where: { supplierId: id, shopId: ctx.shopId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    const recentPayments = await prisma.supplierPayment.findMany({
      where: { supplierId: id },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        account: true,
      },
    });

    return {
      supplier: {
        id: s.id,
        name: s.name,
        contactPerson: s.contactPerson || "",
        phone: s.phone || "",
        email: s.email || "",
        address: s.address || "",
        notes: s.notes || "",
        payableBalance: Number(s.payable),
      },
      recentPurchases: recentPurchases.map((p) => ({
        id: p.id,
        invoiceNo: p.invoiceNo || "",
        total: Number(p.total),
        paid: Number(p.paid),
        due: Number(p.due),
        createdAt: p.createdAt.toISOString(),
      })),
      recentPayments: recentPayments.map((p) => ({
        id: p.id,
        amount: Number(p.amount),
        accountName: p.account?.name || "",
        date: p.date.toISOString(),
        notes: p.notes || "",
      })),
    };
  },

  /** Remove a supplier. Requires OWNER. */
  async remove(ctx: Ctx, id: string) {
    requireRole(ctx, "OWNER");

    const supplier = await prisma.supplier.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true, name: true },
    });
    if (!supplier) {
      throw new ServiceError("NOT_FOUND", "Supplier not found", 404);
    }

    await prisma.supplier.deleteMany({
      where: { id, shopId: ctx.shopId },
    });

    await auditLogService.log(ctx, {
      entity: "Supplier",
      entityId: id,
      action: "DELETE",
      diff: { name: supplier.name },
    });
  },
};
