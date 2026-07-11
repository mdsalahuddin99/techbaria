"use client";

import { useState } from "react";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Plus, Edit2, Trash2 } from "lucide-react";
import {
  useWarehouses,
  useCreateWarehouse,
  useUpdateWarehouse,
  useDeleteWarehouse,
} from "@/features/warehouses/hooks";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { toast } from "sonner";
import { Switch } from "@/shared/ui/switch";

export default function WarehousesTab() {
  const warehouses = useWarehouses();
  const create = useCreateWarehouse();
  const update = useUpdateWarehouse();
  const remove = useDeleteWarehouse();

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: "", code: "", isActive: true });

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleOpen = (warehouse?: any) => {
    if (warehouse) {
      setEditingId(warehouse.id);
      setFormData({
        name: warehouse.name,
        code: warehouse.code || "",
        isActive: warehouse.isActive,
      });
    } else {
      setEditingId(null);
      setFormData({ name: "", code: "", isActive: true });
    }
    setIsOpen(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return toast.error("Warehouse name is required");

    try {
      if (editingId) {
        await update.mutateAsync({ id: editingId, data: formData });
        toast.success("Warehouse updated successfully");
      } else {
        await create.mutateAsync(formData);
        toast.success("Warehouse created successfully");
      }
      setIsOpen(false);
    } catch (e: any) {
      toast.error(e.message || "An error occurred");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await remove.mutateAsync(deleteId);
      toast.success("Warehouse deleted successfully");
      setDeleteId(null);
    } catch (e: any) {
      toast.error(e.message || "Cannot delete this warehouse. It may have existing stock or transactions.");
      setDeleteId(null);
    }
  };

  return (
    <Card className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Warehouses</h3>
          <p className="text-sm text-muted-foreground">Manage your shop locations and warehouses.</p>
        </div>
        <Button onClick={() => handleOpen()} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Add Warehouse
        </Button>
      </div>

      <div className="border rounded-md divide-y">
        {warehouses.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No warehouses found.</div>
        ) : (
          warehouses.map((w) => (
            <div key={w.id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
              <div>
                <p className="font-medium flex items-center gap-2">
                  {w.name}
                  {!w.isActive && (
                    <span className="text-[10px] uppercase bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded-full font-semibold">
                      Inactive
                    </span>
                  )}
                </p>
                {w.code && <p className="text-xs text-muted-foreground">Code: {w.code}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={() => handleOpen(w)}>
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(w.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit/Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Warehouse" : "Add Warehouse"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Warehouse Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Main Branch"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Code (Optional)</label>
              <Input
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                placeholder="e.g. WH-01"
              />
            </div>
            <div className="flex items-center justify-between pt-2">
              <div className="space-y-0.5">
                <label className="text-sm font-medium">Active Status</label>
                <p className="text-xs text-muted-foreground">Allow transactions for this warehouse</p>
              </div>
              <Switch
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the warehouse. You cannot delete a warehouse that already has stock, sales, or purchases.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
