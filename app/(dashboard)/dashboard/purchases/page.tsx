import { listSuppliersAction } from "@/server/actions/suppliers";
import { listProductsAction } from "@/server/actions/products";
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
    listSuppliersAction(),
    listProductsAction(undefined, { limit: 2000 }),
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
