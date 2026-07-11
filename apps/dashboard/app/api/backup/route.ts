export const runtime = "nodejs";

import { apiHandler } from "@/server/lib/apiHandler";
import type { Ctx } from "@/server/lib/ctx";

export const GET = apiHandler(async (_ctx: Ctx) => {
  return [];
}, "backup:list", ["ADMIN"]);

export const POST = apiHandler(async (_ctx: Ctx) => {
  return { id: "", name: "", size: 0, createdAt: new Date().toISOString() };
}, "backup:create", ["ADMIN"]);

export const DELETE = apiHandler(async (_ctx: Ctx) => {
  return { ok: true };
}, "backup:delete", ["ADMIN"]);
