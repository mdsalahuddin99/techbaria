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
    suppliersRes,
    productsRes,
    purchasesRes,
    accountsRes,
    ledgerRes
  ] = await Promise.all([
    suppliersService.list(ctx),
    productsService.list(ctx, { limit: 2000 }),
    purchasesService.list(ctx),
    accountsService.list(ctx),
    accountsService.listLedger(ctx),
  ]);

  return (
    <PurchasesClient
      initialSuppliers={suppliersRes.items}
      initialProducts={productsRes.items}
      initialPurchases={purchasesRes.items}
      initialAccounts={accountsRes.items}
      initialLedger={ledgerRes}
    />
  );
}
