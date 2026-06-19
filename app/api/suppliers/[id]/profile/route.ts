export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { suppliersService } from "@/server/services/suppliersService";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(
  async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
    return suppliersService.getProfile(ctx, params.id);
  },
  "suppliers:getProfile",
  ["MANAGER", "OWNER"],
);
