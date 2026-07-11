import { salesService } from "@/server/services/salesService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { OnlineOrdersClient } from "./OnlineOrdersClient";

export default async function OnlineOrdersPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);
  const ordersRes = await salesService.listStorefrontOrders(ctx, { limit: 200 });

  return <OnlineOrdersClient initialOrders={ordersRes.items} />;
}
