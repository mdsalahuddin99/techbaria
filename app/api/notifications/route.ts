export const runtime = "nodejs";

import { apiHandler, parseBody } from "@/server/lib/apiHandler";
import { notificationsService } from "@/server/services/notificationsService";
import { notificationCreateSchema } from "@/shared/validators/notification";
import { parsePaginationParams } from "@/server/lib/paginate";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (ctx: Ctx, req: Request) => {
  const url = new URL(req.url);
  const countOnly = url.searchParams.get("count");
  if (countOnly === "true") {
    return { count: await notificationsService.unreadCount(ctx) };
  }
  const pagination = parsePaginationParams(url);
  return notificationsService.list(ctx, pagination);
});

export const POST = apiHandler(async (ctx: Ctx, req: Request) => {
  const body = await parseBody(req, notificationCreateSchema);
  return notificationsService.push(ctx, body);
});
