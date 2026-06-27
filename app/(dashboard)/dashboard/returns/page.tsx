import { listSalesAction } from "@/server/actions/sales";
import { salesService } from "@/server/services/salesService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { ReturnsClient } from "./ReturnsClient";

export default async function ReturnsPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user as any);
  
  const [
    salesRes,
    returnsRes,
  ] = await Promise.all([
    listSalesAction(),
    salesService.listReturns(ctx),
  ]);

  return (
    <ReturnsClient
      initialSales={salesRes.items as any}
      initialReturns={returnsRes.items as any}
      initialAccounts={[]}
      initialLedger={[]}
    />
  );
}
