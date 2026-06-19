export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { transfersService } from "@/server/services/transfersService";
import type { Ctx } from "@/server/lib/ctx";

export const POST = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  await transfersService.receive(ctx, params.id);
  return { success: true };
});
