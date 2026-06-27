import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useCreateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => warehousesService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses", "list"] });
    },
  });
}

export function useUpdateWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => warehousesService.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses", "list"] });
    },
  });
}

export function useDeleteWarehouse() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => warehousesService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["warehouses", "list"] });
    },
  });
}

