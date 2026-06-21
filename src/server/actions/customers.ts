"use server";

import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { ServiceError } from "@/server/lib/errors";
import { customersService, type CustomerCreatePayload, type CustomerUpdatePayload } from "@/server/services/customersService";
import { customerLedgerService } from "@/server/services/customerLedgerService";
import { customerCreateSchema, customerUpdateSchema, collectDueSchema } from "@/shared/validators/customer";
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
  return buildCtx(session.user as any);
}

// ─── Basic CRUD ─────────────────────────────────────────────────────────────

export async function listCustomersAction(search?: string, params?: PaginationParams) {
  const ctx = await getActionCtx();
  return customersService.list(ctx, params, search);
}

export async function getCustomerByIdAction(id: string) {
  const ctx = await getActionCtx();
  return customersService.getById(ctx, id);
}

export async function createCustomerAction(input: CustomerCreatePayload) {
  const ctx = await getActionCtx();
  const valid = customerCreateSchema.parse(input) as CustomerCreatePayload;
  return customersService.create(ctx, valid);
}

export async function updateCustomerAction(id: string, input: CustomerUpdatePayload) {
  const ctx = await getActionCtx();
  const valid = customerUpdateSchema.parse(input) as CustomerUpdatePayload;
  return customersService.update(ctx, id, valid);
}

export async function deleteCustomerAction(id: string) {
  const ctx = await getActionCtx();
  await customersService.remove(ctx, id);
  return { success: true };
}

export async function getCustomersWithDuesAction() {
  const ctx = await getActionCtx();
  return customersService.withDues(ctx);
}

// ─── Ledger & Accounting ────────────────────────────────────────────────────

export async function getCustomerLedgerAction(customerId: string, page = 1, pageSize = 20) {
  const ctx = await getActionCtx();
  return customerLedgerService.getLedger(ctx, customerId, page, pageSize);
}

export async function getCustomerBalanceAction(customerId: string) {
  const ctx = await getActionCtx();
  return customerLedgerService.getBalance(ctx, customerId);
}

export async function collectCustomerPaymentAction(
  customerId: string, 
  data: { amount: number; accountId: string; reference?: string; notes?: string }
) {
  const ctx = await getActionCtx();
  const valid = collectDueSchema.parse(data);
  return customerLedgerService.collectDue(ctx, customerId, valid.amount, valid.accountId, valid.reference, valid.notes);
}

export async function depositCustomerAdvanceAction(
  customerId: string, 
  data: { amount: number; accountId: string; reference?: string; notes?: string }
) {
  const ctx = await getActionCtx();
  const valid = collectDueSchema.parse(data);
  return customerLedgerService.depositAdvance(ctx, customerId, valid.amount, valid.accountId, valid.reference, valid.notes);
}

export async function withdrawCustomerPaymentAction(
  customerId: string, 
  data: { amount: number; accountId: string; reference?: string; notes?: string }
) {
  const ctx = await getActionCtx();
  const valid = collectDueSchema.parse(data);
  return customerLedgerService.withdrawCustomerWallet(ctx, customerId, valid.amount, valid.accountId, valid.reference, valid.notes);
}
