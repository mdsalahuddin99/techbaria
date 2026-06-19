export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { customerLedgerService } from "@/server/services/customerLedgerService";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(
  async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
    return customerLedgerService.getBalance(ctx, params.id);
  },
);