export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  group: "Regular" | "Wholesale" | "Technician";
  referencePerson?: string;
  loyaltyPoints: number;
  totalSpent: number;
  /** Advance deposit (positive = customer has given us advance money). */
  balance?: number;
  /** Outstanding due / credit (positive = customer owes us). */
  due?: number;
  /** Credit limit for this customer. 0 = no limit. */
  creditLimit?: number;
  address?: string;
  notes?: string;
  sales?: Array<{ invoiceNo: string }>;
  createdAt: string;
}


export interface CustomerDuePayment {
  id: string;
  customerId: string;
  amount: number;
  accountId: string;
  method: "Cash" | "Card" | "Mobile Banking";
  date: string;
  note?: string;
  /** Optional sale invoice this collection settles. */
  saleId?: string;
}
