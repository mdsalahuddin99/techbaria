export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import type { Ctx } from "@/server/lib/ctx";
import { cache } from "@/lib/cache";

const respond = apiHandler(async (ctx: Ctx) => {
  await cache.invalidate("app:*");
  await cache.invalidate("products:storefront:*");

  return { ok: true, message: "Cache cleared successfully" };
}, "cache:clear", ["ADMIN"]);

export const POST = respond;
