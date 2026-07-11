export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import { notificationsService } from "@/server/services/notificationsService";
import type { Ctx } from "@/server/lib/ctx";

export const POST = apiHandler(async (ctx: Ctx) => {
  await notificationsService.markAllRead(ctx);
  return { success: true };
});
