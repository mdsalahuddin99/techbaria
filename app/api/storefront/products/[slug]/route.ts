export const runtime = "nodejs";

import { publicApiHandler } from "@/server/lib/apiHandler";
import { productsService } from "@/server/services/productsService";

export const GET = publicApiHandler(async (req: Request, { params }: { params: Record<string, string | string[]> | undefined }) => {
  if (!params?.slug || typeof params.slug !== "string") return new Response("Not found", { status: 404 });
  return productsService.getBySlug(params.slug);
});
