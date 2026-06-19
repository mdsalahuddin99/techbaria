export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { customerLedgerService } from "@/server/services/customerLedgerService";
import { collectDueSchema } from "@/shared/validators/customer";
import type { Ctx } from "@/server/lib/ctx";

export const POST = apiHandler(
  async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
    const body = await parseBody(req, collectDueSchema);
    return customerLedgerService.depositAdvance(
      ctx,
      params.id,
      body.amount,
      body.accountId,
      body.reference,
      body.notes,
    );
  },
);
