export const runtime = "nodejs";

import { publicApiHandler } from "@/server/lib/apiHandler";
import { salesService } from "@/server/services/salesService";

export const GET = publicApiHandler(async (req: Request, opts) => {
  const params = opts?.params ?? {};
  const id = params.id as string;
  if (!id) return new Response("Missing order id", { status: 400 });

  return salesService.getStorefrontOrder(
    { userId: "", role: "CASHIER" },
    id,
  );
});
