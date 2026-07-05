/**
 * Suppliers service — Prisma-backed, framework-agnostic.
 *
 * Scoped directly for a single tenant.
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { requireRole } from "@/server/auth/rbac";
import { paginate, type PaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "./auditLogService";

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

export interface SupplierListFilter {
  search?: string;
  sortKey?: "name" | "payable" | "totalPurchased" | "joined";
  sortDir?: "asc" | "desc";
}

export const suppliersService = {
  /** List all suppliers for the shop (paginated). */
  async list(ctx: Ctx, params?: PaginationParams, filter?: SupplierListFilter) {
    const where: any = {};
    if (filter?.search) {
      const q = filter.search;
      where.OR = [
        { name: { contains: q, mode: "insensitive" as const } },
        { phone: { startsWith: q } },
        { email: { startsWith: q, mode: "insensitive" as const } },
      ];
    }

    let orderBy: any = { createdAt: "desc" as const };
    if (filter?.sortKey) {
      const dir = filter.sortDir || "asc";
      switch (filter.sortKey) {
        case "name": orderBy = { name: dir }; break;
        case "payable": orderBy = { payable: dir }; break;
        case "joined": orderBy = { createdAt: dir }; break;
        // totalPurchased is an aggregate, cannot be sorted easily at DB level without a view or subquery
        // We will default to name asc if not matched
      }
    } else {
      orderBy = { name: "asc" as const };
    }

    const raw = await paginate<any>(
      prisma.supplier,
      { where },
      params,
      { orderBy },
    );

    // Aggregate total purchased per supplier in one query
    const supplierIds = raw.items.map((s: any) => s.id);
    const purchaseTotals = await prisma.purchase.groupBy({
      by: ["supplierId"],
      where: { supplierId: { in: supplierIds } },
      _sum: { total: true },
    });
    const totalMap = new Map(
      purchaseTotals.map((p: any) => [p.supplierId, Number(p._sum.total ?? 0)])
    );

    return {
      ...raw,
      items: raw.items.map((s: any) => ({
        id: s.id,
        name: s.name,
        contactPerson: s.contactPerson || "",
        phone: s.phone || "",
        email: s.email || "",
        address: s.address || "",
        notes: s.notes || "",
        payableBalance: Number(s.payable),
        advanceBalance: Number(s.advanceBalance),
        totalPurchased: totalMap.get(s.id) ?? 0,
        createdAt: s.createdAt.toISOString(),
      })),
    };
  },

  /** Get a single supplier by ID. */
  async getById(ctx: Ctx, id: string) {
    const s = await prisma.supplier.findUnique({
      where: { id },
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
      advanceBalance: Number(s.advanceBalance),
      totalPurchased,
      createdAt: s.createdAt.toISOString(),
    };
  },

  /** Create a new supplier. Requires MANAGER+. */
  async create(ctx: Ctx, input: SupplierCreateInput) {
    requireRole(ctx, "ADMIN");

    if (!input.name?.trim()) {
      throw new ServiceError("VALIDATION", "Supplier name is required", 400);
    }

    const s = await prisma.supplier.create({
      data: {
        name: input.name,
        contactPerson: input.contactPerson || null,
        phone: input.phone || null,
        email: input.email || null,
        address: input.address || null,
        notes: input.notes || null,
        payable: 0,
        advanceBalance: 0,
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
      advanceBalance: Number(s.advanceBalance),
      totalPurchased: 0,
      createdAt: s.createdAt.toISOString(),
    };
  },

  /** Update an existing supplier. Requires MANAGER+. */
  async update(ctx: Ctx, id: string, input: SupplierUpdateInput) {
    requireRole(ctx, "ADMIN");

    const existing = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new ServiceError("NOT_FOUND", "Supplier not found", 404);
    }

    await prisma.supplier.update({
      where: { id },
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
    requireRole(ctx, "ADMIN");
    const s = await prisma.supplier.findUnique({
      where: { id },
    });
    if (!s) throw new ServiceError("NOT_FOUND", "Supplier not found", 404);

    const recentPurchases = await prisma.purchase.findMany({
      where: { supplierId: id },
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
        advanceBalance: Number(s.advanceBalance),
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
    requireRole(ctx, "ADMIN");

    const supplier = await prisma.supplier.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!supplier) {
      throw new ServiceError("NOT_FOUND", "Supplier not found", 404);
    }

    await prisma.supplier.delete({
      where: { id },
    });

    await auditLogService.log(ctx, {
      entity: "Supplier",
      entityId: id,
      action: "DELETE",
      diff: { name: supplier.name },
    });
  },
};
