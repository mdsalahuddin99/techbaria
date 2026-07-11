import type { PaymentMethod } from "@/features/sales/types";

export interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address?: string;
  notes?: string;
  totalPurchased: number;
  payableBalance: number;
  advanceBalance?: number;
  createdAt: string;
}

export interface SupplierPayment {
  id: string;
  supplierId: string;
  amount: number;
  method: PaymentMethod;
  /** Account the payment came out of. */
  accountId?: string;
  date: string;
  note?: string;
}
