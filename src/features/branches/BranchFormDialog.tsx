import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import type { Branch } from "@/features/branches/types";
import { useBranchActions } from "@/features/branches/hooks";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  branch?: Branch | null;
}

const empty = {
  name: "",
  code: "",
  address: "",
  phone: "",
  isHeadOffice: false,
  isActive: true,
};

export default function BranchFormDialog({ open, onOpenChange, branch }: Props) {
  const { addBranch, updateBranch } = useBranchActions();
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (open) {
      setForm(
        branch
          ? {
              name: branch.name,
              code: branch.code,
              address: branch.address ?? "",
              phone: branch.phone ?? "",
              isHeadOffice: branch.isHeadOffice,
              isActive: branch.isActive,
            }
          : empty
      );
    }
  }, [open, branch]);

  const submit = () => {
    if (!form.name.trim() || !form.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    if (branch) {
      updateBranch(branch.id, form);
      toast.success("Branch updated");
    } else {
      addBranch(form);
      toast.success("Branch created");
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{branch ? "Edit Branch" : "New Branch"}</DialogTitle>
          <DialogDescription>
            Manage a separate shop / outlet. Stock and sales can be tracked per branch.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Dhaka Outlet"
              />
            </div>
            <div>
              <Label>Code</Label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
                placeholder="DHK-01"
              />
            </div>
          </div>
          <div>
            <Label>Address</Label>
            <Input
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>
          <div>
            <Label>Phone</Label>
            <Input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <p className="font-medium text-sm">Active</p>
              <p className="text-xs text-muted-foreground">Inactive branches are hidden from POS.</p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(v) => setForm({ ...form, isActive: v })}
            />
          </div>
          <div className="flex items-center justify-between p-3 border rounded-md">
            <div>
              <p className="font-medium text-sm">Head Office</p>
              <p className="text-xs text-muted-foreground">Default branch for owners and consolidated reports.</p>
            </div>
            <Switch
              checked={form.isHeadOffice}
              onCheckedChange={(v) => setForm({ ...form, isHeadOffice: v })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit} className="bg-primary text-primary-foreground hover:bg-primary/90">
            {branch ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
