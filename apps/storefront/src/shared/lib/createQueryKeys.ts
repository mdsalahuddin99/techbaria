/**
 * Feature-scoped query-key factory.
 *   keys.all                    → ["<entity>"]
 *   keys.list(filters?)         → [..., "list", filters]
 *   keys.detail(id)             → [..., "detail", id]
 *   keys.scope(name, args?)     → [..., name, args]
 */
export interface FeatureQueryKeys {
  all: readonly unknown[];
  list: (filters?: Record<string, unknown>) => readonly unknown[];
  detail: (id: string) => readonly unknown[];
  scope: (name: string, args?: unknown) => readonly unknown[];
}

export function createQueryKeys(entity: string): FeatureQueryKeys {
  const root = () => [entity] as const;
  return {
    get all() {
      return root();
    },
    list: (filters) => [...root(), "list", filters ?? {}] as const,
    detail: (id) => [...root(), "detail", id] as const,
    scope: (name, args) => [...root(), name, args ?? {}] as const,
  };
}
