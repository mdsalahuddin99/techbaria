/**
 * Customers service — Prisma-backed, framework-agnostic.
 *
 * Scoped directly for a single tenant.
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { paginate, type PaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "./auditLogService";
import { serializeCustomer } from "@/server/lib/serialize";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CustomerCreatePayload {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  group?: string;
  referencePerson?: string;
  notes?: string;
}

export interface CustomerUpdatePayload {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  group?: string;
  referencePerson?: string;
  notes?: string;
}

// ─── Service ────────────────────────────────────────────────────────────────

export interface CustomerListFilter {
  search?: string;
  dueFilter?: "all" | "with-due" | "no-due";
  sortKey?: "name" | "due" | "totalSpent" | "loyalty" | "joined";
  sortDir?: "asc" | "desc";
}

export const customersService = {
  /** List all customers (paginated). */
  async list(ctx: Ctx, params?: PaginationParams, filter?: CustomerListFilter) {
    const where: any = {};
    if (filter?.search) {
      const q = filter.search;
      where.OR = [
        { name: { contains: q, mode: "insensitive" as const } },
        { phone: { contains: q } },
        { email: { contains: q, mode: "insensitive" as const } },
      ];
    }
    if (filter?.dueFilter === "with-due") {
      where.due = { gt: 0 };
    } else if (filter?.dueFilter === "no-due") {
      where.due = { lte: 0 };
    }
    
    let orderBy: any = { createdAt: "desc" as const };
    if (filter?.sortKey) {
      const dir = filter.sortDir || "asc";
      switch (filter.sortKey) {
        case "name": orderBy = { name: dir }; break;
        case "totalSpent": orderBy = { totalSpent: dir }; break;
        case "loyalty": orderBy = { loyaltyPoints: dir }; break;
        case "joined": orderBy = { createdAt: dir }; break;
        case "due": orderBy = { due: dir }; break;
      }
    }

    const res = await paginate(
      prisma.customer,
      { where },
      params,
      { orderBy },
    );
    return {
      ...res,
      items: res.items.map(serializeCustomer),
    };
  },

  /** Get a single customer by ID. */
  async getById(ctx: Ctx, id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { sales: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
    if (!customer) throw new ServiceError("NOT_FOUND", "Customer not found", 404);
    return {
      ...serializeCustomer(customer),
      sales: customer.sales ? customer.sales.map((s: any) => ({
        ...s,
        total: Number(s.total),
        subtotal: Number(s.subtotal),
        discount: Number(s.discount),
        paid: Number(s.paid),
        due: Number(s.due),
        createdAt: s.createdAt.toISOString(),
        editedAt: s.editedAt ? s.editedAt.toISOString() : null,
      })) : undefined,
    };
  },

  /** Create a new customer. */
  async create(ctx: Ctx, input: CustomerCreatePayload) {
    const customer = await prisma.customer.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address,
        group: input.group,
        referencePerson: input.referencePerson,
        notes: input.notes,
      } as any,
    });
    return serializeCustomer(customer);
  },

  /** Update a customer. */
  async update(ctx: Ctx, id: string, input: CustomerUpdatePayload) {
    const existing = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new ServiceError("NOT_FOUND", "Customer not found", 404);
    }

    await prisma.customer.update({
      where: { id },
      data: input as any,
    });

    await auditLogService.log(ctx, {
      entity: "Customer",
      entityId: id,
      action: "UPDATE",
      diff: input as unknown as Record<string, unknown>,
    });

    const updated = await prisma.customer.findUnique({ where: { id } });
    return serializeCustomer(updated!);
  },

  /** Delete a customer. */
  async remove(ctx: Ctx, id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      select: { id: true, name: true },
    });
    if (!customer) {
      throw new ServiceError("NOT_FOUND", "Customer not found", 404);
    }

    await prisma.customer.delete({
      where: { id },
    });

    await auditLogService.log(ctx, {
      entity: "Customer",
      entityId: id,
      action: "DELETE",
      diff: { name: customer.name },
    });
  },

  async withDues(ctx: Ctx) {
    const customers = await prisma.customer.findMany({
      where: { due: { gt: 0 } },
      orderBy: { due: "desc" },
      take: 100, // Prevent massive memory spike
    });
    return customers.map(serializeCustomer);
  },
};
