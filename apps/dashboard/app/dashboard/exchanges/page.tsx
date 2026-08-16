import { salesService } from "@/server/services/salesService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { ExchangesClient } from "./ExchangesClient";

export default async function ExchangesPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  
  const exchangesRes = await salesService.listExchanges(ctx);

  return (
    <ExchangesClient
      initialExchanges={exchangesRes.items as any}
    />
  );
}
