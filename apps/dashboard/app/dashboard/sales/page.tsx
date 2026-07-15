import { listSalesAction } from "@/server/actions/sales";
import { SalesClient } from "./SalesClient";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, queryKeys } from "@/shared/lib";

export default async function SalesHistoryPage() {
  const queryClient = getQueryClient();

  const filter = {
    search: undefined,
    paymentMethod: undefined,
    sortKey: "newest",
    sortDir: undefined,
    limit: 5,
  };

  await queryClient.prefetchInfiniteQuery({
    queryKey: [...queryKeys.sales.list(), filter],
    queryFn: () => listSalesAction(filter, { limit: 5 }),
    initialPageParam: undefined,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SalesClient />
    </HydrationBoundary>
  );
}
