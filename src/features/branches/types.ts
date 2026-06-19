export interface Branch {
  id: string;
  name: string;
  code: string; // e.g. "DHK-01"
  address?: string;
  phone?: string;
  isHeadOffice: boolean;
  isActive: boolean;
  createdAt: string;
}

export type BranchInput = Omit<Branch, "id" | "createdAt">;
