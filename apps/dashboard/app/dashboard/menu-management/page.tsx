import { categoriesService } from "@/server/services/categoriesService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { MenuManagementClient } from "./MenuManagementClient";

export const metadata = {
  title: "Menu Management | Dashboard",
};

export default async function MenuManagementPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user || {});
  const categories = await categoriesService.listFlat(ctx, { hasPublishedProducts: true });

  return <MenuManagementClient initialCategories={categories} />;
}
