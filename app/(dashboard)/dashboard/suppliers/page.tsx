import { listSuppliersAction } from "@/server/actions/suppliers";
import { purchasesService } from "@/server/services/purchasesService";
import { accountsService } from "@/server/services/accountsService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { SuppliersClient } from "./SuppliersClient";

export default async function SuppliersPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user as any);
  
  // We can fetch data concurrently
  const [suppliersRes, purchasesRes, accountsRes, ledgerRes] = await Promise.all([
    listSuppliersAction(),
    purchasesService.list(ctx),
    accountsService.list(ctx),
    accountsService.listLedger(ctx),
  ]);

  return (
    <SuppliersClient
      initialSuppliers={suppliersRes.items}
      initialPurchases={purchasesRes.items}
      initialAccounts={accountsRes.items}
      initialLedger={ledgerRes}
    />
  );
}
