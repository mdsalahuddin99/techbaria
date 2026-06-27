import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { HeroSlideType, HeroSlideCreateInput, HeroSlideUpdateInput } from "@/shared/validators/storefront";
import { toast } from "sonner";

export function useHeroSlides() {
  const queryClient = useQueryClient();

  const query = useQuery<HeroSlideType[]>({
    queryKey: ["hero-slides"],
    queryFn: async () => {
      const res = await fetch("/api/storefront/hero-slides");
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return res.json();
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: HeroSlideCreateInput) => {
      const res = await fetch("/api/storefront/hero-slides", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      toast.success("Hero slide created successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to create hero slide");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: HeroSlideUpdateInput }) => {
      const res = await fetch(`/api/storefront/hero-slides/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      toast.success("Hero slide updated successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to update hero slide");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/storefront/hero-slides/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text);
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["hero-slides"] });
      toast.success("Hero slide deleted successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to delete hero slide");
    },
  });

  return {
    heroSlides: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    createSlide: createMutation.mutate,
    isCreating: createMutation.isPending,
    updateSlide: updateMutation.mutate,
    isUpdating: updateMutation.isPending,
    deleteSlide: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}
