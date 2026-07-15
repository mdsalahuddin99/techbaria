"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
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

interface ModelsTabProps {
  initialModels: any[];
  filterOnlineOnly?: boolean;
  products: any[];
  onOpenImport: (type: string) => void;
}

export function ModelsTab({ initialModels, filterOnlineOnly = false, products, onOpenImport }: ModelsTabProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [modelProductFilter, setModelProductFilter] = useState<string>("all");

  const { data: allModels = [] } = useQuery({
    queryKey: ["catalog", "models", { filterOnlineOnly }],
    queryFn: async () => {
      const res = await fetch(`/api/catalog?entity=models`);
      if (!res.ok) return [];
      const data = await res.json();
      return filterOnlineOnly ? data.filter((x: any) => x.isPublished) : data;
    },
    initialData: initialModels,
  });

  let filteredModels = allModels.filter((m: any) => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = modelProductFilter === "all" || (m.productTypes && m.productTypes.includes(modelProductFilter));
    return matchesSearch && matchesFilter;
  });

  if (!searchQuery.trim()) {
    filteredModels = [...filteredModels].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5);
  }

  const productNameById = new Map(products.map((p: any) => [p.id, p]));

  // States
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createProducts, setCreateProducts] = useState<string[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editProducts, setEditProducts] = useState<string[]>([]);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Mutations
  const createItemMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to create");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", "models"] });
      setCreateOpen(false);
      setCreateName("");
      setCreateProducts([]);
      toast.success("Model created successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to create model"),
  });

  const updateItemMut = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/catalog", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to update");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", "models"] });
      setEditOpen(false);
      setEditingItem(null);
      toast.success("Model updated successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to update model"),
  });

  const deleteItemMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/catalog?entity=models&id=${id}`, { method: "DELETE" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to delete");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", "models"] });
      setDeleteId(null);
      toast.success("Model deleted successfully");
    },
    onError: (err: any) => toast.error(err.message || "Failed to delete model"),
  });

  const handleCreate = () => {
    if (!createName.trim()) return toast.error("Name is required");
    const isDuplicate = allModels.some((m: any) => m.name.toLowerCase() === createName.toLowerCase());
    if (isDuplicate) return toast.error("A model with this name already exists");
    createItemMut.mutate({ entity: "models", name: createName, productTypes: createProducts });
  };

  const handleSaveEdit = () => {
    if (!editName.trim() || !editingItem) return toast.error("Name is required");
    const isDuplicate = allModels.some((m: any) => m.id !== editingItem.id && m.name.toLowerCase() === editName.toLowerCase());
    if (isDuplicate) return toast.error("A model with this name already exists");
    updateItemMut.mutate({ entity: "models", id: editingItem.id, name: editName, productTypes: editProducts });
  };

  const handleExport = () => {
    const exportData = allModels.map((item: any) => ({
      ID: item.id,
      Name: item.name,
      "Is Published": item.isPublished ? "Yes" : "No"
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `models_export.csv`);
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
            <p className="text-sm text-muted-foreground">Total Models</p>
            <p className="text-2xl font-bold">{filteredModels.length}</p>
          </div>
        </div>
        <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
          <div className="relative w-full sm:w-48">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search models..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={modelProductFilter} onValueChange={setModelProductFilter}>
            <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Filter by product name" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All product names</SelectItem>
              {products.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!filterOnlineOnly && (
            <>
              <Button variant="outline" size="icon" title="Export Models" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" title="Import Models" onClick={() => onOpenImport("models")}>
                <Upload className="h-4 w-4" />
              </Button>
              <Button onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Plus className="h-4 w-4 mr-2" />Add Model
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card>
        <div className="divide-y">
          {filteredModels.map((model: any) => {
            const modelProductTypes: string[] = model.productTypes ?? [];
            return (
              <div key={model.id} className="p-2 sm:p-3 hover:bg-secondary/20 transition-colors">
                {editingItem?.id === model.id ? (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1 text-sm h-8 sm:h-10" autoFocus />
                      <LoadingButton size="sm" className="h-8 sm:h-10 text-xs sm:text-sm" onClick={handleSaveEdit} loading={updateItemMut.isPending}>Save</LoadingButton>
                      <Button size="sm" variant="outline" className="h-8 sm:h-10 text-xs sm:text-sm" onClick={() => setEditingItem(null)}>Cancel</Button>
                    </div>
                    <div>
                      <p className="text-[10px] sm:text-xs text-muted-foreground mb-1.5">Product Names (Select which product names this model belongs to):</p>
                      <div className="flex flex-wrap gap-2 max-h-48 overflow-y-auto border p-2 rounded">
                        {products.map((p) => (
                          <label key={p.id} className="flex items-center gap-1.5 text-xs sm:text-sm cursor-pointer">
                            <input type="checkbox" className="rounded" checked={editProducts.includes(p.id)}
                              onChange={(e) => setEditProducts(prev => e.target.checked ? [...prev, p.id] : prev.filter(s => s !== p.id))}
                            />
                            {p.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">{model.name}</p>
                      {modelProductTypes.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {modelProductTypes.map((ptId: string) => {
                            const ptName = productNameById.get(ptId)?.name || ptId;
                            return <Badge key={ptId} variant="outline" className="text-[10px] sm:text-xs py-0 h-4 sm:h-5 leading-none">{ptName}</Badge>;
                          })}
                        </div>
                      )}
                    </div>
                    {!filterOnlineOnly && (
                      <>
                        <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 border-r mr-1">
                          <Switch
                            checked={model.isPublished}
                            onCheckedChange={(val) => updateItemMut.mutate({ entity: "models", id: model.id, name: model.name, isPublished: val })}
                            className="scale-75 sm:scale-100"
                          />
                          <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">Web</span>
                        </div>
                        <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => {
                          setEditingItem(model);
                          setEditName(model.name);
                          setEditProducts(modelProductTypes);
                        }}>
                          <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" onClick={() => setDeleteId(model.id)}>
                          <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {filteredModels.length === 0 && (
            <EmptyState icon={FolderTree} title="No models yet" description="Click “Add Model” to create your first item." />
          )}
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setCreateName(""); setCreateProducts([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Model</DialogTitle>
            <DialogDescription>Create a new global catalog model.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }} />
            </div>
            {products.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm">Product Names <span className="text-muted-foreground">(optional)</span></Label>
                <p className="text-xs text-muted-foreground">Select which product names this model belongs to.</p>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                  <div className="flex flex-col gap-2">
                    {products.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" className="rounded" checked={createProducts.includes(p.id)}
                          onChange={(e) => setCreateProducts(prev => e.target.checked ? [...prev, p.id] : prev.filter(s => s !== p.id))}
                        />
                        {p.name}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createItemMut.isPending}>Cancel</Button>
            <LoadingButton className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCreate} loading={createItemMut.isPending}>Save</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this model?</AlertDialogTitle>
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
