export const runtime = "nodejs";

import { publicApiHandler } from "@/server/lib/apiHandler";
import { productsService } from "@/server/services/productsService";

export const GET = publicApiHandler(async (shopId: string, _req: Request, { params }: { params: { slug: string } }) => {
  return productsService.getBySlug(shopId, params.slug);
});
