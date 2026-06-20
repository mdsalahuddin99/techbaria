import { apiFetch } from "./fetch";

export interface Warehouse {
  id: string;
  name: string;
  code: string | null;
  isActive: boolean;
}

export const warehousesApi = {
  list(): Promise<Warehouse[]> {
    return apiFetch<Warehouse[]>("/api/warehouses");
  },
};
