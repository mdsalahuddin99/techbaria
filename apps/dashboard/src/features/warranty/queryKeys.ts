export const warrantyKeys = {
  all: ["warranty-claims"] as const,
  list: () => [...warrantyKeys.all, "list"] as const,
  detail: (id: string) => [...warrantyKeys.all, "detail", id] as const,
};
