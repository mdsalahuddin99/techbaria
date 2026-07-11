import { suppliersService } from "@/server/services/suppliersService";
import { productsService } from "@/server/services/productsService";
import { purchasesService } from "@/server/services/purchasesService";
import { accountsService } from "@/server/services/accountsService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { PurchasesClient } from "./PurchasesClient";

export default async function PurchasesPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  const [
    purchasesRes,
    accountsRes,
    ledgerRes
  ] = await Promise.all([
    purchasesService.list(ctx),
    accountsService.list(ctx),
    accountsService.listLedger(ctx),
  ]);

  return (
    <PurchasesClient
      initialSuppliers={[]} // suppliers are now fetched via AsyncSuggest
      initialProducts={[]} // products are now fetched via AsyncSuggest
      initialPurchases={purchasesRes.items}
      initialAccounts={accountsRes.items}
      initialLedger={ledgerRes}
    />
  );
}
