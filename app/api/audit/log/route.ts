import { apiHandler } from "@/server/lib/apiHandler";
import { auditLogService } from "@/server/services/auditLogService";
import { z } from "zod";

// ─── GET /api/audit/log ─────────────────────────────────────────────────────
// List audit log entries with optional filters.

const listQuerySchema = z.object({
  entity: z.string().optional(),
  entityId: z.string().optional(),
  action: z.enum(["CREATE", "UPDATE", "DELETE"]).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional().default(50),
  offset: z.coerce.number().int().min(0).optional().default(0),
});

export const GET = apiHandler(async (ctx, req) => {
  const url = new URL(req.url);
  const query = listQuerySchema.parse(Object.fromEntries(url.searchParams));
  const result = await auditLogService.list(ctx, query);
  return result;
});

export const runtime = "nodejs";
