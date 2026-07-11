export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { supplierLedgerService } from "@/server/services/supplierLedgerService";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const url = new URL(req.url);
  const page = parseInt(url.searchParams.get("page") || "1", 10);
  
  return supplierLedgerService.getLedger(ctx, params.id, page, 50); // 50 items per page
});
