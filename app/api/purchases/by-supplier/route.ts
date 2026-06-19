export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { purchasesService } from "@/server/services/purchasesService";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(
  async (ctx: Ctx, req: Request) => {
    const url = new URL(req.url);
    const supplierId = url.searchParams.get("supplierId");
    if (!supplierId) {
      return [];
    }
    return purchasesService.listBySupplier(ctx, supplierId);
  },
  "purchases:listBySupplier",
  ["MANAGER", "OWNER"],
);
