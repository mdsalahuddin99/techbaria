import { listSalesAction } from "@/server/actions/sales";
import { SalesClient } from "./SalesClient";
import type { Sale } from "@/shared/lib/types";

export default async function SalesHistoryPage() {
  const salesRes = await listSalesAction();

  return <SalesClient initialSales={salesRes.items as Sale[]} />;
}
