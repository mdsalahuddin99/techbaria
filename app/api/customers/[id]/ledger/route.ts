export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { customerLedgerService } from "@/server/services/customerLedgerService";
import { parsePaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(
  async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") ?? "1", 10);
    const pageSize = parseInt(url.searchParams.get("pageSize") ?? "20", 10);

    return customerLedgerService.getLedger(ctx, params.id, page, pageSize);
  },
);