export const reportKeys = {
  all: ["reports"] as const,
  metrics: (from: string, to: string, paymentMethod: string) => [...reportKeys.all, "metrics", { from, to, paymentMethod }] as const,
  inventoryMetrics: () => [...reportKeys.all, "inventoryMetrics"] as const,
};
