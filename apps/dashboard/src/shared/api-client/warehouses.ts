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

  create(data: Partial<Warehouse>): Promise<Warehouse> {
    return apiFetch<Warehouse>("/api/warehouses", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  update(id: string, data: Partial<Warehouse>): Promise<Warehouse> {
    return apiFetch<Warehouse>(`/api/warehouses/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  remove(id: string): Promise<void> {
    return apiFetch<void>(`/api/warehouses/${id}`, {
      method: "DELETE",
    });
  },
};
