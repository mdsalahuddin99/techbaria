"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { formatCurrency } from "@/shared/lib/format";
import { Building2, Warehouse as WarehouseIcon } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api-client/fetch";
import type { Branch } from "@/features/branches/types";

interface Warehouse {
  id: string;
  name: string;
  branchId: string;
}

interface InvoiceHeaderProps {

  /** All branches for the first selector */
  branches: Branch[];
  selectedBranchId: string | null;
  onBranchChange: (id: string | null) => void;

  /** Dependent warehouses for the second selector */
  warehouses: Warehouse[];
  selectedWarehouseId: string | null;
  onWarehouseChange: (id: string) => void;

  editMode: boolean;
}

export function InvoiceHeader({
  branches,
  selectedBranchId,
  onBranchChange,
  warehouses,
  selectedWarehouseId,
  onWarehouseChange,
  editMode,
}: InvoiceHeaderProps) {
  const activeBranches = branches.filter((b) => b.isActive);

  return (
    <div className="flex flex-col gap-4">
      {/* Title row */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-700 tracking-tight">
            {editMode ? "Edit Sale Invoice" : "New Sale Invoice"}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            {editMode
              ? "Update the existing invoice details below."
              : "Select a branch, add products, and record payment."}
          </p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-[11px] font-medium text-slate-400 mb-0.5">Date</p>
          <p className="text-sm font-semibold text-slate-700">
            {new Date().toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
      </div>

      {/* Selectors row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* 1. Branch selector */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <Building2 className="h-3 w-3" />
            Branch
          </label>
          <Select
            value={selectedBranchId ?? ""}
            onValueChange={(v) => onBranchChange(v)}
          >
            <SelectTrigger className="h-9 bg-card border-slate-200 text-sm">
              <SelectValue placeholder="Select branch…" />
            </SelectTrigger>
            <SelectContent>
              {activeBranches.length === 0 && (
                <SelectItem value="__none" disabled>
                  No active branches
                </SelectItem>
              )}
              {activeBranches.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  <span className="flex items-center gap-2">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {b.name}
                    {b.isHeadOffice && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 rounded px-1 font-medium">
                        HQ
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 2. Warehouse selector */}
        <div className="space-y-1.5">
          <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            <WarehouseIcon className="h-3 w-3" />
            Warehouse
          </label>
          <Select
            value={selectedWarehouseId ?? ""}
            onValueChange={(v) => onWarehouseChange(v)}
            disabled={!selectedBranchId}
          >
            <SelectTrigger className="h-9 bg-card border-slate-200 text-sm">
              <SelectValue placeholder="Select warehouse…" />
            </SelectTrigger>
            <SelectContent>
              {warehouses.filter((w) => w.branchId === selectedBranchId).map((w) => (
                <SelectItem key={w.id} value={w.id}>
                  <span className="flex items-center gap-2">
                    <WarehouseIcon className="h-3.5 w-3.5 text-slate-400" />
                    {w.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!selectedWarehouseId && (
            <p className="text-[10px] text-amber-500 font-medium">
              ⚠ Select a warehouse to see stock
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
