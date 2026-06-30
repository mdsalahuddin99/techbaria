import { listCustomersAction } from "@/server/actions/customers";
import { listSuppliersAction } from "@/server/actions/suppliers";
import { accountsService } from "@/server/services/accountsService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { AccountsClient } from "./AccountsClient";

export default async function AccountsPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  const [
    customersRes,
    suppliersRes,
    accountsRes,
    ledgerRes
  ] = await Promise.all([
    listCustomersAction(),
    listSuppliersAction(),
    accountsService.list(ctx),
    accountsService.listLedger(ctx),
  ]);

  return (
    <AccountsClient
      initialCustomers={customersRes.items}
      initialSuppliers={suppliersRes.items}
      initialAccounts={accountsRes.items}
      initialLedger={ledgerRes}
    />
  );
}
