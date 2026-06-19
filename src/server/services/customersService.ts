/**
 * Customers service — Prisma-backed, framework-agnostic.
 */
import "server-only";
import { prisma } from "@/server/db/client";
import { ServiceError } from "@/server/lib/errors";
import { paginate, type PaginationParams, type Paginated } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";
import { auditLogService } from "./auditLogService";
import { cache } from "@/lib/cache";

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
  /** List all customers for the shop (paginated). */
  async list(ctx: Ctx, params?: PaginationParams, search?: string) {
    const where: any = { shopId: ctx.shopId };
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
    const customer = await prisma.customer.findFirst({
      where: { id, shopId: ctx.shopId },
      include: { sales: { orderBy: { createdAt: "desc" }, take: 10 } },
    });
    if (!customer) throw new ServiceError("NOT_FOUND", "Customer not found", 404);
    return customer;
  },

  /** Create a new customer. */
  async create(ctx: Ctx, input: CustomerCreateInput) {
    return prisma.customer.create({
      data: {
        shopId: ctx.shopId,
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
    const updated = await prisma.customer.updateMany({
      where: { id, shopId: ctx.shopId },
      data: input,
    });
    if (updated.count === 0) {
      throw new ServiceError("NOT_FOUND", "Customer not found", 404);
    }

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
    const customer = await prisma.customer.findFirst({
      where: { id, shopId: ctx.shopId },
      select: { id: true, name: true },
    });
    if (!customer) {
      throw new ServiceError("NOT_FOUND", "Customer not found", 404);
    }

    await prisma.customer.deleteMany({
      where: { id, shopId: ctx.shopId },
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
      where: { shopId: ctx.shopId, due: { gt: 0 } },
      orderBy: { due: "desc" },
    });
  },
};
