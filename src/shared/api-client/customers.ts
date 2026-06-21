/**
 * Typed client using Next.js Server Actions.
 */
import type { Customer } from "@/features/customers/types";
import { 
  listCustomersAction, 
  getCustomerByIdAction, 
  createCustomerAction, 
  updateCustomerAction, 
  deleteCustomerAction,
  getCustomersWithDuesAction,
  getCustomerLedgerAction,
  getCustomerBalanceAction,
  collectCustomerPaymentAction,
  depositCustomerAdvanceAction,
  withdrawCustomerPaymentAction
} from "@/server/actions/customers";

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor: string | null;
  hasMore: boolean;
}

export const customersApi = {
  list(search?: string): Promise<PaginatedResponse<Customer>> {
    return listCustomersAction(search) as unknown as Promise<PaginatedResponse<Customer>>;
  },

  getById(id: string): Promise<Customer | null> {
    return getCustomerByIdAction(id) as unknown as Promise<Customer | null>;
  },

  create(data: Partial<Customer>): Promise<Customer> {
    return createCustomerAction(data as any) as unknown as Promise<Customer>;
  },

  update(id: string, data: Partial<Customer>): Promise<Customer> {
    return updateCustomerAction(id, data as any) as unknown as Promise<Customer>;
  },

  remove(id: string): Promise<void> {
    return deleteCustomerAction(id).then(() => undefined);
  },

  withDues(): Promise<Customer[]> {
    return getCustomersWithDuesAction() as unknown as Promise<Customer[]>;
  },

  // ─── Ledger API ───────────────────────────────────────────────────────

  getLedger(customerId: string, page = 1, pageSize = 20) {
    return getCustomerLedgerAction(customerId, page, pageSize) as any;
  },

  getBalance(customerId: string) {
    return getCustomerBalanceAction(customerId) as any;
  },

  collectPayment(customerId: string, data: { amount: number; accountId: string; reference?: string; notes?: string }) {
    return collectCustomerPaymentAction(customerId, data) as any;
  },

  depositAdvance(customerId: string, data: { amount: number; accountId: string; reference?: string; notes?: string }) {
    return depositCustomerAdvanceAction(customerId, data) as any;
  },

  withdrawPayment(customerId: string, data: { amount: number; accountId: string; reference?: string; notes?: string }) {
    return withdrawCustomerPaymentAction(customerId, data) as any;
  },
};
