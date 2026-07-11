export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { shiftsService } from "@/server/services/shiftsService";
import { shiftCloseSchema } from "@/shared/validators/shift";
import type { Ctx } from "@/server/lib/ctx";

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const { closingCount } = await parseBody(req, shiftCloseSchema);
  await shiftsService.close(ctx, closingCount);
  return { success: true };
});
