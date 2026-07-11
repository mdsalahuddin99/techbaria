import { listCustomersAction } from "@/server/actions/customers";
import { listSalesAction } from "@/server/actions/sales";
import { accountsService } from "@/server/services/accountsService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { CustomersClient } from "./CustomersClient";
import type { Customer, Sale } from "@/shared/lib/types";

export default async function CustomersPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  const [
    customersRes,
    salesRes,
    accountsRes
  ] = await Promise.all([
    listCustomersAction(),
    listSalesAction(),
    accountsService.list(ctx),
  ]);

  return (
    <CustomersClient
      initialCustomers={customersRes.items as unknown as Customer[]}
      initialSales={salesRes.items as Sale[]}
      initialAccounts={accountsRes.items}
    />
  );
}
