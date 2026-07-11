/**
 * Backward-compat barrel. The canonical query keys now live per-feature
 * (e.g. `@/features/products/queryKeys`). New code should import from
 * those modules; this object stays so older imports keep compiling.
 *
 * @deprecated Import `productKeys`, `customerKeys`, … from each feature.
 */
import { productKeys } from "@/features/products/queryKeys";
import { customerKeys } from "@/features/customers/queryKeys";
import { supplierKeys } from "@/features/suppliers/queryKeys";
import { expenseKeys } from "@/features/expenses/queryKeys";
import { saleKeys, returnKeys } from "@/features/sales/queryKeys";
import { inventoryKeys } from "@/features/inventory/queryKeys";
import { notificationKeys } from "@/features/notifications/queryKeys";
import { purchaseKeys, restockKeys } from "@/features/purchases/queryKeys";

export const queryKeys = {
  products: productKeys,
  customers: customerKeys,
  suppliers: supplierKeys,
  expenses: expenseKeys,
  sales: saleKeys,
  returns: returnKeys,
  inventory: inventoryKeys,
  notifications: notificationKeys,
  purchases: purchaseKeys,
  restocks: restockKeys,
  categories: {
    all: ["categories"] as const,
    list: () => ["categories", "list"] as const,
  },
  settings: { all: ["settings"] as const },
  reports: { overview: (range?: string) => ["reports", "overview", range] as const },
} as const;

export { createQueryKeys } from "./createQueryKeys";
