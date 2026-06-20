"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Warehouse as WarehouseIcon } from "lucide-react";

interface Warehouse {
  id: string;
  name: string;
}

interface InvoiceHeaderProps {
  /** All warehouses directly under the shop */
  warehouses: Warehouse[];
  selectedWarehouseId: string | null;
  onWarehouseChange: (id: string) => void;

  editMode: boolean;
}

export function InvoiceHeader({
  warehouses,
  selectedWarehouseId,
  onWarehouseChange,
  editMode,
}: InvoiceHeaderProps) {
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
              : warehouses.length > 1
                ? "Select a warehouse, add products, and record payment."
                : "Add products and record payment."}
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
      {warehouses.length > 1 && (
        <div className="grid grid-cols-1 gap-3">
          {/* Warehouse selector */}
          <div className="space-y-1.5">
            <label className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <WarehouseIcon className="h-3 w-3" />
              Warehouse
            </label>
            <Select
              value={selectedWarehouseId ?? ""}
              onValueChange={(v) => onWarehouseChange(v)}
            >
              <SelectTrigger className="h-9 bg-card border-border rounded-[4px] text-sm">
                <SelectValue placeholder="Select warehouse…" />
              </SelectTrigger>
              <SelectContent>
                {warehouses.map((w) => (
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
      )}
    </div>
  );
}
