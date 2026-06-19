export const runtime = "nodejs";

import { publicApiHandler } from "@/server/lib/apiHandler";
import { productsService } from "@/server/services/productsService";

export const GET = publicApiHandler(async (shopId: string, req: Request) => {
  const url = new URL(req.url);
  const categoryId = url.searchParams.get("categoryId") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  return productsService.publicList(shopId, { categoryId, search });
});
