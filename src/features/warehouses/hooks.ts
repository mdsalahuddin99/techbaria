import { useQuery } from "@tanstack/react-query";
import { warehousesService } from "@/services";
import { useAuth } from "@/features/auth";
import { QueryTier } from "@/lib/queryConfig";

export function useWarehousesQuery() {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: ["warehouses", "list"] as const,
    queryFn: () => warehousesService.list(),
    enabled: status !== "loading" && !!session,
    ...QueryTier.MASTER_DATA,
  });
}

export function useWarehouses() {
  const { data } = useWarehousesQuery();
  return data ?? [];
}
