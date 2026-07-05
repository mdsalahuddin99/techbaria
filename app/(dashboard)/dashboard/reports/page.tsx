import { listSalesAction } from "@/server/actions/sales";
import { listProductsAction } from "@/server/actions/products";
import { expensesService } from "@/server/services/expensesService";
import { purchasesService } from "@/server/services/purchasesService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { ReportsClient } from "./ReportsClient";

export default async function ReportsPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  return (
    <ReportsClient />
  );
}
