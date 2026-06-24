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
import { saleKeys } from "@/features/sales/queryKeys";
import { productKeys } from "@/features/products/queryKeys";
import { customerKeys } from "@/features/customers/queryKeys";
import DashboardClient from "./_components/DashboardClient";

export default async function DashboardPage() {
  // Build server context from the current session (already validated by middleware)
  const session = await auth();
  const ctx = buildCtx({
    id: (session?.user as any)?.id,
    role: (session?.user as any)?.role,
  });

  // Create a fresh QueryClient for this request
  const queryClient = new QueryClient();

  // Prefetch all three datasets in parallel — one DB round-trip each,
  // all happening on the server before any HTML is sent to the client.
  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: saleKeys.list(),
      queryFn: () => salesQueries.list(ctx),
    }),
    queryClient.prefetchQuery({
      queryKey: productKeys.list(),
      queryFn: () => productQueries.list(ctx),
    }),
    queryClient.prefetchQuery({
      queryKey: customerKeys.list(),
      queryFn: () => customersService.list(ctx),
    }),
  ]);

  // Serialize the prefetched cache to send to the client
  const dehydratedState = dehydrate(queryClient);

  return (
    // HydrationBoundary injects the server-fetched data into the
    // client-side QueryClient before DashboardClient mounts,
    // so hooks see populated data on the very first render.
    <HydrationBoundary state={dehydratedState}>
      <DashboardClient />
    </HydrationBoundary>
  );
}
