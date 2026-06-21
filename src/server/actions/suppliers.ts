"use server";

import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { ServiceError } from "@/server/lib/errors";
import { suppliersService, type SupplierCreateInput, type SupplierUpdateInput } from "@/server/services/suppliersService";
import { supplierCreateSchema, supplierUpdateSchema } from "@/shared/validators/supplier";
import type { PaginationParams } from "@/server/lib/paginate";

/**
 * Helper to build an authenticated context for Server Actions.
 * Throws ServiceError if not authenticated.
 */
async function getActionCtx() {
  const session = await auth();
  if (!session?.user) {
    throw new ServiceError("UNAUTHENTICATED", "User not authenticated", 401);
  }
  // buildCtx expects the session user
  return buildCtx(session.user as any);
}

/**
 * List all suppliers (paginated)
 */
export async function listSuppliersAction(params?: PaginationParams) {
  const ctx = await getActionCtx();
  return suppliersService.list(ctx, params);
}

/**
 * Get a single supplier by ID
 */
export async function getSupplierByIdAction(id: string) {
  const ctx = await getActionCtx();
  return suppliersService.getById(ctx, id);
}

/**
 * Get a supplier's full profile (including recent purchases and payments)
 */
export async function getSupplierProfileAction(id: string) {
  const ctx = await getActionCtx();
  return suppliersService.getProfile(ctx, id);
}

/**
 * Create a new supplier
 */
export async function createSupplierAction(input: SupplierCreateInput) {
  const ctx = await getActionCtx();
  // Validate input using the shared Zod schema
  const valid = supplierCreateSchema.parse(input) as SupplierCreateInput;
  return suppliersService.create(ctx, valid);
}

/**
 * Update an existing supplier
 */
export async function updateSupplierAction(id: string, input: SupplierUpdateInput) {
  const ctx = await getActionCtx();
  // Validate input using the shared Zod schema
  const valid = supplierUpdateSchema.parse(input) as SupplierUpdateInput;
  return suppliersService.update(ctx, id, valid);
}

/**
 * Delete a supplier
 */
export async function deleteSupplierAction(id: string) {
  const ctx = await getActionCtx();
  await suppliersService.remove(ctx, id);
  return { success: true };
}
