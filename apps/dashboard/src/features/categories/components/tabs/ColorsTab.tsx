"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { FolderTree, Pencil, Trash2, Search, Download, Upload, Plus } from "lucide-react";
import { toast } from "sonner";
import Papa from "papaparse";
import { EmptyState } from "@/shared/components";

interface ColorsTabProps {
  initialColors: any[];
  filterOnlineOnly?: boolean;
  onOpenImport: (type: string) => void;
}

export function ColorsTab({ initialColors, filterOnlineOnly = false, onOpenImport }: ColorsTabProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allColors = [] } = useQuery({
    queryKey: ["catalog", "colors", { filterOnlineOnly }],
    queryFn: async () => {
      const res = await fetch(`/api/catalog?entity=colors`);
      if (!res.ok) return [];
      const data = await res.json();
      return filterOnlineOnly ? data.filter((x: any) => x.isPublished) : data;
    },
    initialData: initialColors,
  });

  let filteredColors = allColors.filter((c: any) =>
    c.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!searchQuery.trim()) {
    filteredColors = [...filteredColors].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5);
  }


  // States
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");

  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editName, setEditName] = useState("");

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Mutations
  const createItemMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", "colors"] });
      setCreateOpen(false);
      setCreateName("");
      toast.success("Color created successfully");
    },
    onError: () => toast.error("Failed to create color"),
  });

  const updateItemMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", "colors"] });
      setEditOpen(false);
      setEditingItem(null);
      toast.success("Color updated successfully");
    },
    onError: () => toast.error("Failed to update color"),
  });

  const deleteItemMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/catalog?entity=colors&id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", "colors"] });
      setDeleteId(null);
      toast.success("Color deleted successfully");
    },
    onError: () => toast.error("Failed to delete color"),
  });

  const handleCreate = async () => {
    if (!createName.trim()) return toast.error("Name is required");
    const isDuplicate = allColors.some((c: any) => c.name.toLowerCase() === createName.toLowerCase());
    if (isDuplicate) return toast.error("A color with this name already exists");
    await createItemMut.mutateAsync({ entity: "colors", name: createName });
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editingItem) return toast.error("Name is required");
    const isDuplicate = allColors.some((c: any) => c.id !== editingItem.id && c.name.toLowerCase() === editName.toLowerCase());
    if (isDuplicate) return toast.error("A color with this name already exists");
    await updateItemMut.mutateAsync({ entity: "colors", id: editingItem.id, name: editName });
  };

  const handleExport = () => {
    const exportData = allColors.map((item: any) => ({
      ID: item.id,
      Name: item.name,
      "Is Published": item.isPublished ? "Yes" : "No"
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `colors_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
            <FolderTree className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Colors</p>
            <p className="text-2xl font-bold">{allColors.length}</p>
          </div>
        </div>
        <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search colors..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          {!filterOnlineOnly && (
            <>
              <Button variant="outline" size="icon" title="Export Colors" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" title="Import Colors" onClick={() => onOpenImport("colors")}>
                <Upload className="h-4 w-4" />
              </Button>
              <Button onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Plus className="h-4 w-4 mr-2" />Add Color
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card>
        <div className="divide-y">
          {filteredColors.map((color: any) => {
            return (
              <div key={color.id} className="flex items-center gap-1.5 sm:gap-2 p-2 sm:p-3 hover:bg-secondary/20 transition-colors">
                <div className="flex-1 min-w-0"><p className="font-medium text-sm sm:text-base truncate">{color.name}</p></div>
                {!filterOnlineOnly && (
                  <>
                    <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 border-r mr-1">
                      <Switch checked={color.isPublished} onCheckedChange={(val) => updateItemMut.mutate({ entity: "colors", id: color.id, name: color.name, isPublished: val })} className="scale-75 sm:scale-100" />
                      <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">Web</span>
                    </div>
                    <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => {
                      setEditingItem(color);
                      setEditName(color.name);
                      setEditOpen(true);
                    }}><Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" onClick={() => setDeleteId(color.id)}><Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" /></Button>
                  </>
                )}
              </div>
            );
          })}
          {allColors.length === 0 && <EmptyState icon={FolderTree} title="No colors yet" description="Click “Add Color” to create your first item." />}
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) setCreateName(""); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Color</DialogTitle>
            <DialogDescription>Create a new global catalog color.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createItemMut.isPending}>Cancel</Button>
            <LoadingButton className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCreate} loading={createItemMut.isPending}>Save</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditingItem(null); setEditName(""); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Color</DialogTitle>
            <DialogDescription>Update catalog details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); }} />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setEditOpen(false)} disabled={updateItemMut.isPending}>Cancel</Button>
            <LoadingButton className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSaveEdit} loading={updateItemMut.isPending}>Save</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this color?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteItemMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteItemMut.isPending}
              onClick={() => deleteId && deleteItemMut.mutate(deleteId)}
              className="bg-destructive text-destructive-foreground"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
