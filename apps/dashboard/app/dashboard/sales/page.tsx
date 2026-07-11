import { listSalesAction } from "@/server/actions/sales";
import { SalesClient } from "./SalesClient";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { getQueryClient, queryKeys } from "@/shared/lib";

export default async function SalesHistoryPage() {
  const queryClient = getQueryClient();

  const filter = {
    search: "",
    paymentMethod: "All",
    sortKey: "newest",
    sortDir: undefined,
  };

  await queryClient.prefetchInfiniteQuery({
    queryKey: [...queryKeys.sales.list(), filter],
    queryFn: () => listSalesAction(filter),
    initialPageParam: undefined,
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <SalesClient />
    </HydrationBoundary>
  );
}
