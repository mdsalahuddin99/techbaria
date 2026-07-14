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

interface BrandsTabProps {
  initialBrands: any[];
  filterOnlineOnly?: boolean;
  categories: any[];
  onOpenImport: (type: string) => void;
}

export function BrandsTab({ initialBrands, filterOnlineOnly = false, categories, onOpenImport }: BrandsTabProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allBrands = [] } = useQuery({
    queryKey: ["catalog", "brands", { filterOnlineOnly }],
    queryFn: async () => {
      const res = await fetch(`/api/catalog?entity=brands`);
      if (!res.ok) return [];
      const data = await res.json();
      return filterOnlineOnly ? data.filter((x: any) => x.isPublished) : data;
    },
    initialData: initialBrands,
  });

  const filteredBrands = allBrands.filter((b: any) =>
    b.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // States
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createSubcategories, setCreateSubcategories] = useState<string[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editSubcategories, setEditSubcategories] = useState<string[]>([]);

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
      queryClient.invalidateQueries({ queryKey: ["catalog", "brands"] });
      setCreateOpen(false);
      setCreateName("");
      setCreateSubcategories([]);
      toast.success("Brand created successfully");
    },
    onError: () => toast.error("Failed to create brand"),
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
      queryClient.invalidateQueries({ queryKey: ["catalog", "brands"] });
      setEditOpen(false);
      setEditingItem(null);
      toast.success("Brand updated successfully");
    },
    onError: () => toast.error("Failed to update brand"),
  });

  const deleteItemMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/catalog?entity=brands&id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", "brands"] });
      setDeleteId(null);
      toast.success("Brand deleted successfully");
    },
    onError: () => toast.error("Failed to delete brand"),
  });

  const handleCreate = async () => {
    if (!createName.trim()) return toast.error("Name is required");
    const isDuplicate = allBrands.some((b: any) => b.name.toLowerCase() === createName.toLowerCase());
    if (isDuplicate) return toast.error("A brand with this name already exists");
    await createItemMut.mutateAsync({ entity: "brands", name: createName, subcategories: createSubcategories });
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editingItem) return toast.error("Name is required");
    const isDuplicate = allBrands.some((b: any) => b.id !== editingItem.id && b.name.toLowerCase() === editName.toLowerCase());
    if (isDuplicate) return toast.error("A brand with this name already exists");
    await updateItemMut.mutateAsync({ entity: "brands", id: editingItem.id, name: editName, subcategories: editSubcategories });
  };

  const handleExport = () => {
    const exportData = allBrands.map((item: any) => ({
      ID: item.id,
      Name: item.name,
      "Is Published": item.isPublished ? "Yes" : "No"
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `brands_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Subcategories array specifically for mapping check-boxes
  const subcategories = categories
    .filter(c => c.parentId)
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-4">
      <Card className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
            <FolderTree className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Total Brands</p>
            <p className="text-2xl font-bold">{allBrands.length}</p>
          </div>
        </div>
        <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search brands..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          {!filterOnlineOnly && (
            <>
              <Button variant="outline" size="icon" title="Export Brands" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" title="Import Brands" onClick={() => onOpenImport("brands")}>
                <Upload className="h-4 w-4" />
              </Button>
              <Button onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Plus className="h-4 w-4 mr-2" />Add Brand
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card>
        <div className="divide-y">
          {filteredBrands.map((brand: any) => {
            const brandSubcats: string[] = brand.subcategories ?? [];
            return (
              <div key={brand.id} className="p-2 sm:p-3 hover:bg-secondary/20 transition-colors">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{brand.name}</p>
                    {brandSubcats.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {brandSubcats.map((s: string) => (
                          <Badge key={s} variant="outline" className="text-[10px] sm:text-xs py-0 h-4 sm:h-5 leading-none">{s}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  {!filterOnlineOnly && (
                    <>
                      <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 border-r mr-1">
                        <Switch
                          checked={brand.isPublished}
                          onCheckedChange={(val) => updateItemMut.mutate({ entity: "brands", id: brand.id, name: brand.name, isPublished: val })}
                          className="scale-75 sm:scale-100"
                        />
                        <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">Web</span>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => {
                        setEditingItem(brand);
                        setEditName(brand.name);
                        setEditSubcategories(brandSubcats);
                        setEditOpen(true);
                      }}>
                        <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" onClick={() => setDeleteId(brand.id)}>
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {allBrands.length === 0 && (
            <EmptyState icon={FolderTree} title="No brands yet" description="Click “Add Brand” to create your first brand." />
          )}
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setCreateName(""); setCreateSubcategories([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Brand</DialogTitle>
            <DialogDescription>Create a new global catalog brand.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }} />
            </div>
            {subcategories.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm">Subcategories <span className="text-muted-foreground">(optional)</span></Label>
                <p className="text-xs text-muted-foreground">Select which subcategories this brand belongs to.</p>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                  <div className="flex flex-col gap-2">
                    {subcategories.map((sc) => (
                      <label key={sc.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" className="rounded" checked={createSubcategories.includes(sc.name)}
                          onChange={(e) => setCreateSubcategories(prev => e.target.checked ? [...prev, sc.name] : prev.filter(s => s !== sc.name))}
                        />
                        {sc.name}
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

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditingItem(null); setEditName(""); setEditSubcategories([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Brand</DialogTitle>
            <DialogDescription>Update catalog details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); }} />
            </div>
            {subcategories.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm">Subcategories</Label>
                <p className="text-xs text-muted-foreground">Select which subcategories this brand belongs to.</p>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                  <div className="flex flex-col gap-2">
                    {subcategories.map((sc) => (
                      <label key={sc.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" className="rounded" checked={editSubcategories.includes(sc.name)}
                          onChange={(e) => setEditSubcategories(prev => e.target.checked ? [...prev, sc.name] : prev.filter(s => s !== sc.name))}
                        />
                        {sc.name}
                      </label>
                    ))}
                    {editSubcategories.filter(s => !subcategories.some(sc => sc.name === s)).map((invalidName) => (
                      <label key={invalidName} className="flex items-center gap-2 text-sm cursor-pointer text-destructive">
                        <input type="checkbox" className="rounded" checked={true}
                          onChange={() => setEditSubcategories(prev => prev.filter(s => s !== invalidName))}
                        />
                        {invalidName} (Missing/Renamed)
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            )}
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
            <AlertDialogTitle>Delete this brand?</AlertDialogTitle>
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
