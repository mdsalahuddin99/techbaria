import { ItemListClient } from "./ItemListClient";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import { categoriesService } from "@/server/services/categoriesService";
import { listItemLists } from "@/server/services/itemListService";

export default async function ItemListPage() {
  const session = await auth();
  const ctx = buildCtx(session?.user);

  const [categories, itemLists] = await Promise.all([
    categoriesService.listFlat(ctx),
    listItemLists(ctx),
  ]);

  return <ItemListClient initialCategories={categories} initialItemLists={itemLists} />;
}
