/**
 * Dashboard page — Server Component.
 *
 * Prefetches sales, products, and customers data on the server using
 * TanStack Query's `dehydrate` + `HydrationBoundary`. This seeds the
 * client-side cache before React hydrates, so DashboardClient renders
 * instantly with real data — no loading spinners on the happy path.
 *
 * All existing hooks (useSalesQuery, useProductsQuery, useCustomersQuery)
 * are unchanged. They simply read from the pre-seeded cache.
 */
import { dehydrate, HydrationBoundary, QueryClient } from "@tanstack/react-query";
import { auth } from "@/server/auth/config";
import { buildCtx } from "@/server/lib/ctx";
import * as salesQueries from "@/server/services/sales/queries";
import * as productQueries from "@/server/services/products/queries";
import { customersService } from "@/server/services/customersService";
import { dashboardService } from "@/server/services/dashboardService";
import { saleKeys } from "@/features/sales/queryKeys";
import { productKeys } from "@/features/products/queryKeys";
import { customerKeys } from "@/features/customers/queryKeys";
import { dashboardKeys } from "@/features/dashboard/queryKeys";
import DashboardClient from "./_components/DashboardClient";

export default async function DashboardPage() {
  const session = await auth();
  const ctx = buildCtx({
    id: (session?.user as any)?.id,
    role: (session?.user as any)?.role,
  });

  const queryClient = new QueryClient();

  // Prefetch dashboard metrics plus recent sales/products for the tables below
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: dashboardKeys.metrics(),
      queryFn: () => dashboardService.getMetrics(ctx),
    }),
    queryClient.prefetchQuery({
      queryKey: saleKeys.list(),
      queryFn: () => salesQueries.list(ctx),
    }),
    queryClient.prefetchQuery({
      queryKey: productKeys.list(),
      queryFn: () => productQueries.list(ctx),
    }),
  ]);

  const dehydratedState = dehydrate(queryClient);

  return (
    <HydrationBoundary state={dehydratedState}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
