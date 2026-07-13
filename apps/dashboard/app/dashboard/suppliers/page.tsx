import { listSuppliersAction } from "@/server/actions/suppliers";
import { purchasesService } from "@/server/services/purchasesService";
import { accountsService } from "@/server/services/accountsService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { SuppliersClient } from "./SuppliersClient";

export default async function SuppliersPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  // We can fetch data concurrently
  const [suppliersRes, purchasesRes, accountsRes, ledgerRes] = await Promise.all([
    listSuppliersAction({ limit: 5 }),
    purchasesService.list(ctx),
    accountsService.list(ctx),
    accountsService.listLedger(ctx),
  ]);

  return (
    <SuppliersClient
      initialSuppliers={Array.isArray(suppliersRes) ? suppliersRes : suppliersRes?.items || []}
      initialPurchases={Array.isArray(purchasesRes) ? purchasesRes : purchasesRes?.items || []}
      initialAccounts={Array.isArray(accountsRes) ? accountsRes : accountsRes?.items || []}
      initialLedger={ledgerRes}
    />
  );
}
