import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import type { Category } from "@/shared/lib/types";

type RelMode = "none" | "set" | "increase" | "decrease";
type RelUnit = "amount" | "percent";

export interface BulkState {
  priceMode: RelMode; priceValue: string; priceUnit: RelUnit;
  costMode: RelMode; costValue: string; costUnit: RelUnit;
  wholesaleMode: RelMode; wholesaleValue: string; wholesaleUnit: RelUnit;
  stockMode: "none" | "set" | "add" | "subtract"; stockValue: string;
  minStockMode: "none" | "set"; minStockValue: string;
  statusMode: "none" | "active" | "inactive";
  categoryMode: "none" | "set"; categoryValue: Category | "";
}

export const initialBulkState: BulkState = {
  priceMode: "none", priceValue: "", priceUnit: "amount",
  costMode: "none", costValue: "", costUnit: "amount",
  wholesaleMode: "none", wholesaleValue: "", wholesaleUnit: "amount",
  stockMode: "none", stockValue: "",
  minStockMode: "none", minStockValue: "",
  statusMode: "none",
  categoryMode: "none", categoryValue: "",
};

interface BulkEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedCount: number;
  bulk: BulkState;
  onBulkChange: (next: BulkState) => void;
  onApply: () => void;
  categories: Category[];
}

/** Bulk-edit dialog for selected products. Stateless — parent owns `bulk`. */
export function BulkEditDialog({
  open, onOpenChange, selectedCount, bulk, onBulkChange, onApply, categories,
}: BulkEditDialogProps) {
  const set = (patch: Partial<BulkState>) => onBulkChange({ ...bulk, ...patch });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk edit {selectedCount} product{selectedCount > 1 ? "s" : ""}</DialogTitle>
          <DialogDescription>Leave a section as "No change" to keep existing values.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <RelativeField label="Sale Price" mode={bulk.priceMode} value={bulk.priceValue} unit={bulk.priceUnit}
            onMode={(v) => set({ priceMode: v })} onValue={(v) => set({ priceValue: v })} onUnit={(v) => set({ priceUnit: v })} />
          <RelativeField label="Cost Price" mode={bulk.costMode} value={bulk.costValue} unit={bulk.costUnit}
            onMode={(v) => set({ costMode: v })} onValue={(v) => set({ costValue: v })} onUnit={(v) => set({ costUnit: v })} />
          <RelativeField label="Wholesale Price" mode={bulk.wholesaleMode} value={bulk.wholesaleValue} unit={bulk.wholesaleUnit}
            onMode={(v) => set({ wholesaleMode: v })} onValue={(v) => set({ wholesaleValue: v })} onUnit={(v) => set({ wholesaleUnit: v })} />

          <Section title="Stock">
            <Select value={bulk.stockMode} onValueChange={(v) => set({ stockMode: v as BulkState["stockMode"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No change</SelectItem>
                <SelectItem value="set">Set to</SelectItem>
                <SelectItem value="add">Add</SelectItem>
                <SelectItem value="subtract">Subtract</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Quantity" value={bulk.stockValue}
              onChange={(e) => set({ stockValue: e.target.value })} disabled={bulk.stockMode === "none"} />
          </Section>

          <Section title="Min Stock Alert Level">
            <Select value={bulk.minStockMode} onValueChange={(v) => set({ minStockMode: v as BulkState["minStockMode"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No change</SelectItem>
                <SelectItem value="set">Set to</SelectItem>
              </SelectContent>
            </Select>
            <Input type="number" placeholder="Quantity" value={bulk.minStockValue}
              onChange={(e) => set({ minStockValue: e.target.value })} disabled={bulk.minStockMode === "none"} />
          </Section>



          <div className="rounded-md border p-3 space-y-2">
            <p className="text-sm font-semibold">Status</p>
            <Select value={bulk.statusMode} onValueChange={(v) => set({ statusMode: v as BulkState["statusMode"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No change</SelectItem>
                <SelectItem value="active">Set Active</SelectItem>
                <SelectItem value="inactive">Set Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Section title="Category">
            <Select value={bulk.categoryMode} onValueChange={(v) => set({ categoryMode: v as BulkState["categoryMode"] })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No change</SelectItem>
                <SelectItem value="set">Set to</SelectItem>
              </SelectContent>
            </Select>
            <Select value={bulk.categoryValue} onValueChange={(v) => set({ categoryValue: v as Category })}
              disabled={bulk.categoryMode === "none"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </Section>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={onApply}>
            Apply to {selectedCount} item{selectedCount > 1 ? "s" : ""}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{children}</div>
    </div>
  );
}

function RelativeField({
  label, mode, value, unit, onMode, onValue, onUnit,
}: {
  label: string; mode: RelMode; value: string; unit: RelUnit;
  onMode: (v: RelMode) => void; onValue: (v: string) => void; onUnit: (v: RelUnit) => void;
}) {
  return (
    <div className="rounded-md border p-3 space-y-2">
      <p className="text-sm font-semibold">{label}</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Select value={mode} onValueChange={(v) => onMode(v as RelMode)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="none">No change</SelectItem>
            <SelectItem value="set">Set to</SelectItem>
            <SelectItem value="increase">Increase by</SelectItem>
            <SelectItem value="decrease">Decrease by</SelectItem>
          </SelectContent>
        </Select>
        <Input type="number" placeholder="Value" value={value}
          onChange={(e) => onValue(e.target.value)} disabled={mode === "none"} />
        <Select value={unit} onValueChange={(v) => onUnit(v as RelUnit)}
          disabled={mode === "none" || mode === "set"}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="amount">৳ Amount</SelectItem>
            <SelectItem value="percent">% Percent</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
