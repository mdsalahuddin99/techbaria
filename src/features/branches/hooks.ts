import { useQuery, useQueryClient } from "@tanstack/react-query";
import { usePosStore } from "@/store/usePosStore";
import { branchesApi } from "@/shared/api-client/branches";
import type { Branch, BranchInput } from "./types";
import { useAuth } from "@/features/auth";

export const useBranches = (): Branch[] => {
  const { session, status } = useAuth();
  const { data: branches = [] } = useQuery({
    queryKey: ["branches"],
    queryFn: () => branchesApi.list(),
    enabled: status !== "loading" && !!session,
  });
  return branches;
};

export const useActiveBranchId = () => usePosStore((s) => s.activeBranchId);

export const useActiveBranch = () => {
  const branches = useBranches();
  const activeBranchId = useActiveBranchId();
  return branches.find((b) => b.id === activeBranchId) ?? branches[0] ?? null;
};

export const useBranchActions = () => {
  const queryClient = useQueryClient();
  const setActiveBranch = usePosStore((s) => s.setActiveBranch);
  
  const deleteBranch = async (id: string) => {
    await branchesApi.remove(id);
    queryClient.invalidateQueries({ queryKey: ["branches"] });
  };
  
  const addBranch = async (data: BranchInput) => {
    await branchesApi.add(data);
    queryClient.invalidateQueries({ queryKey: ["branches"] });
  };
  
  const updateBranch = async (id: string, data: Partial<BranchInput>) => {
    await branchesApi.update(id, data);
    queryClient.invalidateQueries({ queryKey: ["branches"] });
  };
  
  return { setActiveBranch, deleteBranch, addBranch, updateBranch };
};
