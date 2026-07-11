import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { warrantyClaimsService } from "@/services";
import { warrantyKeys } from "./queryKeys";
import type { WarrantyClaimCreateInput, WarrantyClaimUpdateInput } from "@/shared/validators/warrantyClaim";
import { toast } from "sonner";
import { useAuth } from "@/features/auth";

export function useWarrantyClaims() {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: warrantyKeys.list(),
    queryFn: () => warrantyClaimsService.list(),
    enabled: status !== "loading" && !!session,
  });
}

export function useWarrantyClaim(id: string) {
  const { session, status } = useAuth();
  return useQuery({
    queryKey: warrantyKeys.detail(id),
    queryFn: () => warrantyClaimsService.getById(id),
    enabled: status !== "loading" && !!session && !!id,
  });
}

export function useCreateWarrantyClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: WarrantyClaimCreateInput) => warrantyClaimsService.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: warrantyKeys.all });
      toast.success("Warranty claim created");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateWarrantyClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: WarrantyClaimUpdateInput }) =>
      warrantyClaimsService.update(id, data),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: warrantyKeys.all });
      toast.success(`Claim ${updated.claimNo} updated`);
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDeleteWarrantyClaim() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => warrantyClaimsService.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: warrantyKeys.all });
      toast.success("Warranty claim deleted");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}
