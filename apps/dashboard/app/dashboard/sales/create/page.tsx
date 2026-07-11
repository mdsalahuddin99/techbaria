import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { CreateSaleClient } from "./CreateSaleClient";
import { posCoreKeys } from "@/features/pos";
import { prisma } from "@/server/db/client";
import { accountsService } from "@/server/services/accountsService";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";

export default async function NewSalePage() {
  const session = await auth();
  const ctx = buildCtx({
    id: session?.user?.id,
    role: session?.user?.role,
  });

  const queryClient = new QueryClient();

  await queryClient.prefetchQuery({
    queryKey: posCoreKeys.all,
    queryFn: async () => {
      const [accounts, warehouses, categories, users, shop] = await Promise.all([
        accountsService.list(ctx),
        prisma.warehouse.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
        prisma.category.findMany({ orderBy: { createdAt: "asc" } }),
        prisma.user.findMany({
          where: { active: true, role: { not: "USER" } },
          select: { id: true, name: true, email: true, role: true },
          orderBy: { name: "asc" },
        }),
        prisma.shop.findFirst({ select: { name: true } }),
      ]);

      return {
        accounts,
        warehouses,
        categories,
        users,
        settings: {
          shopName: shop?.name ?? "AmarShop",
          currencySymbol: "৳",
        },
      };
    },
  });

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <CreateSaleClient />
    </HydrationBoundary>
  );
}
