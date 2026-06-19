export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { notificationsService } from "@/server/services/notificationsService";
import { notificationUpdateSchema } from "@/shared/validators/notification";
import type { Ctx } from "@/server/lib/ctx";

export const PATCH = apiHandler(async (ctx: Ctx, req: Request, { params }: { params: { id: string } }) => {
  const body = await parseBody(req, notificationUpdateSchema);
  if (body.read) {
    await notificationsService.markRead(ctx, params.id);
  } else {
    await notificationsService.update(ctx, params.id, body);
  }
  return { success: true };
});

export const DELETE = apiHandler(async (ctx: Ctx, _req: Request, { params }: { params: { id: string } }) => {
  await notificationsService.remove(ctx, params.id);
  return { success: true };
});
