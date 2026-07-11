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
  editMode?: boolean;
}

export function InvoiceHeader({
  warehouses,
  selectedWarehouseId,
  onWarehouseChange,
}: InvoiceHeaderProps) {
  if (warehouses.length <= 1) return null;

  return (
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
  );
}
