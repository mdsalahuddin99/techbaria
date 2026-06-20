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

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CustomerCreateInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  group?: string;
  referencePerson?: string;
  notes?: string;
}

export interface CustomerUpdateInput {
  name?: string;
  phone?: string;
  email?: string;
  address?: string;
  group?: string;
  referencePerson?: string;
  notes?: string;
}

// ─── Service ────────────────────────────────────────────────────────────────

export const customersService = {
  /** List all customers (paginated). */
  async list(ctx: Ctx, params?: PaginationParams, search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { phone: { contains: search } },
        { email: { contains: search, mode: "insensitive" as const } },
      ];
    }
    return paginate(
      prisma.customer,
      { where },
      params,
      { orderBy: { createdAt: "desc" as const } },
    );
  },

  /** Get a single customer by ID. */
  async getById(ctx: Ctx, id: string) {
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: { sales: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
    if (!customer) throw new ServiceError("NOT_FOUND", "Customer not found", 404);
    return customer;
  },

  /** Create a new customer. */
  async create(ctx: Ctx, input: CustomerCreateInput) {
    return prisma.customer.create({
      data: {
        name: input.name,
        phone: input.phone,
        email: input.email,
        address: input.address,
        group: input.group,
        referencePerson: input.referencePerson,
        notes: input.notes,
      },
    });
  },

  /** Update a customer. */
  async update(ctx: Ctx, id: string, input: CustomerUpdateInput) {
    const existing = await prisma.customer.findUnique({
      where: { id },
      select: { id: true },
    });
    if (!existing) {
      throw new ServiceError("NOT_FOUND", "Customer not found", 404);
    }

    await prisma.customer.update({
      where: { id },
      data: input,
    });

    await auditLogService.log(ctx, {
      entity: "Customer",
      entityId: id,
      action: "UPDATE",
      diff: input as unknown as Record<string, unknown>,
    });

    return prisma.customer.findUnique({ where: { id } });
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

  /** Get customers with outstanding dues. */
  async withDues(ctx: Ctx) {
    return prisma.customer.findMany({
      where: { due: { gt: 0 } },
      orderBy: { due: "desc" },
    });
  },
};
