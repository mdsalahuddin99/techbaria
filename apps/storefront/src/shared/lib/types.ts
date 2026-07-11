/**
 * @deprecated Import directly from `@/features/<name>/types` or `@/shared/types`.
 *
 * This file remains as a backward-compatibility barrel so existing
 * imports continue to work during the architecture migration. New code
 * should import from the owning feature's types module.
 */

export type {
  Category,
  CategoryRecord,
  Product,
  ProductInput,
  ProductUnit,
  ProductUnitStatus,
  ProductCondition,
} from "@/features/products/types";
export type { Customer } from "@/features/customers/types";
export type {
  CartItem,
  PaymentMethod,
  SalePayment,
  Sale,
  RefundMethod,
  ReturnItem,
  SaleReturn,
} from "@/features/sales/types";
export type {
  Supplier,
  SupplierPayment,
} from "@/features/suppliers/types";
export type {
  PurchaseStatus,
  PurchasePayment,
  PurchaseItem,
  PurchaseOrder,
  RestockStatus,
  RestockItem,
  RestockOrder,
} from "@/features/purchases/types";
export type {
  AdjustmentType,
  StockAdjustment,
} from "@/features/inventory/types";
export type { ExpenseCategory, Expense } from "@/features/expenses/types";
export type { ShiftStatus, CashShift } from "@/features/accounts/types";
export type {
  NotificationType,
  AppNotification,
} from "@/features/notifications/types";
export type { ShopSettings } from "@/features/settings/types";

export type { ID, ISODate, Money, BaseEntity, Paginated } from "@/shared/types";
