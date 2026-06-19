import { apiFetch } from "./fetch";

export interface Branch {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  isHeadOffice: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface BranchInput {
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  isHeadOffice: boolean;
  isActive: boolean;
}

export const branchesApi = {
  list(): Promise<Branch[]> {
    return apiFetch<Branch[]>("/api/branches");
  },
  add(data: BranchInput): Promise<Branch> {
    return apiFetch<Branch>("/api/branches", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
  update(id: string, data: Partial<BranchInput>): Promise<Branch> {
    return apiFetch<Branch>(`/api/branches/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
  remove(id: string): Promise<void> {
    return apiFetch<void>(`/api/branches/${id}`, { method: "DELETE" });
  },
};
