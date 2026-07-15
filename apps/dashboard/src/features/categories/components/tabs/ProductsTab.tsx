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

interface ProductsTabProps {
  initialProducts: any[];
  filterOnlineOnly?: boolean;
  brands: any[];
  onOpenImport: (type: string) => void;
}

export function ProductsTab({ initialProducts, filterOnlineOnly = false, brands, onOpenImport }: ProductsTabProps) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: allProducts = [] } = useQuery({
    queryKey: ["catalog", "products", { filterOnlineOnly }],
    queryFn: async () => {
      const res = await fetch(`/api/catalog?entity=products`);
      if (!res.ok) return [];
      const data = await res.json();
      return filterOnlineOnly ? data.filter((x: any) => x.isPublished) : data;
    },
    initialData: initialProducts,
  });

  let filteredProducts = allProducts.filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!searchQuery.trim()) {
    filteredProducts = [...filteredProducts].sort((a: any, b: any) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()).slice(0, 5);
  }


  const brandById = new Map(brands.map((b: any) => [b.id, b]));

  // States
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createBrands, setCreateBrands] = useState<string[]>([]);

  const [editOpen, setEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [editName, setEditName] = useState("");
  const [editBrands, setEditBrands] = useState<string[]>([]);

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
      queryClient.invalidateQueries({ queryKey: ["catalog", "products"] });
      setCreateOpen(false);
      setCreateName("");
      setCreateBrands([]);
      toast.success("Product name created successfully");
    },
    onError: () => toast.error("Failed to create product name"),
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
      queryClient.invalidateQueries({ queryKey: ["catalog", "products"] });
      setEditOpen(false);
      setEditingItem(null);
      toast.success("Product name updated successfully");
    },
    onError: () => toast.error("Failed to update product name"),
  });

  const deleteItemMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/catalog?entity=products&id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog", "products"] });
      setDeleteId(null);
      toast.success("Product name deleted successfully");
    },
    onError: () => toast.error("Failed to delete product name"),
  });

  const handleCreate = async () => {
    if (!createName.trim()) return toast.error("Name is required");
    const isDuplicate = allProducts.some((p: any) => p.name.toLowerCase() === createName.toLowerCase());
    if (isDuplicate) return toast.error("A product name with this name already exists");
    await createItemMut.mutateAsync({ entity: "products", name: createName, brands: createBrands });
  };

  const handleSaveEdit = async () => {
    if (!editName.trim() || !editingItem) return toast.error("Name is required");
    const isDuplicate = allProducts.some((p: any) => p.id !== editingItem.id && p.name.toLowerCase() === editName.toLowerCase());
    if (isDuplicate) return toast.error("A product name with this name already exists");
    await updateItemMut.mutateAsync({ entity: "products", id: editingItem.id, name: editName, brands: editBrands });
  };

  const handleExport = () => {
    const exportData = allProducts.map((item: any) => ({
      ID: item.id,
      Name: item.name,
      "Is Published": item.isPublished ? "Yes" : "No"
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `products_export.csv`);
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
            <p className="text-sm text-muted-foreground">Total Product Names</p>
            <p className="text-2xl font-bold">{allProducts.length}</p>
          </div>
        </div>
        <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search products..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          {!filterOnlineOnly && (
            <>
              <Button variant="outline" size="icon" title="Export Products" onClick={handleExport}>
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" title="Import Products" onClick={() => onOpenImport("products")}>
                <Upload className="h-4 w-4" />
              </Button>
              <Button onClick={() => setCreateOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Plus className="h-4 w-4 mr-2" />Add Product Name
              </Button>
            </>
          )}
        </div>
      </Card>

      <Card>
        <div className="divide-y">
          {filteredProducts.map((product: any) => {
            const productBrands: string[] = product.brands ?? [];
            return (
              <div key={product.id} className="p-2 sm:p-3 hover:bg-secondary/20 transition-colors">
                <div className="flex items-center gap-1.5 sm:gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base truncate">{product.name}</p>
                    {productBrands.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {productBrands.map((brandId: string) => {
                          const bName = brandById.get(brandId)?.name || brandId;
                          return <Badge key={brandId} variant="outline" className="text-[10px] sm:text-xs py-0 h-4 sm:h-5 leading-none">{bName}</Badge>;
                        })}
                      </div>
                    )}
                  </div>
                  {!filterOnlineOnly && (
                    <>
                      <div className="flex items-center gap-1 sm:gap-2 px-1 sm:px-2 border-r mr-1">
                        <Switch
                          checked={product.isPublished}
                          onCheckedChange={(val) => updateItemMut.mutate({ entity: "products", id: product.id, name: product.name, isPublished: val })}
                          className="scale-75 sm:scale-100"
                        />
                        <span className="text-[10px] sm:text-xs text-muted-foreground hidden sm:inline">Web</span>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8" onClick={() => {
                        setEditingItem(product);
                        setEditName(product.name);
                        setEditBrands(productBrands);
                        setEditOpen(true);
                      }}>
                        <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-7 w-7 sm:h-8 sm:w-8 text-destructive" onClick={() => setDeleteId(product.id)}>
                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          {allProducts.length === 0 && (
            <EmptyState icon={FolderTree} title="No product names yet" description="Click “Add Product Name” to create your first item." />
          )}
        </div>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(o) => { setCreateOpen(o); if (!o) { setCreateName(""); setCreateBrands([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Product Name</DialogTitle>
            <DialogDescription>Create a new global catalog product name.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }} />
            </div>
            {brands.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm">Brands <span className="text-muted-foreground">(optional)</span></Label>
                <p className="text-xs text-muted-foreground">Select which brands have this product name.</p>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                  <div className="flex flex-col gap-2">
                    {brands.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" className="rounded" checked={createBrands.includes(b.id)}
                          onChange={(e) => setCreateBrands(prev => e.target.checked ? [...prev, b.id] : prev.filter(s => s !== b.id))}
                        />
                        {b.name}
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
      <Dialog open={editOpen} onOpenChange={(o) => { setEditOpen(o); if (!o) { setEditingItem(null); setEditName(""); setEditBrands([]); } }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Product Name</DialogTitle>
            <DialogDescription>Update catalog details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === "Enter") handleSaveEdit(); }} />
            </div>
            {brands.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-sm">Brands</Label>
                <p className="text-xs text-muted-foreground">Select which brands have this product name.</p>
                <div className="border rounded-md p-3 max-h-48 overflow-y-auto">
                  <div className="flex flex-col gap-2">
                    {brands.map((b) => (
                      <label key={b.id} className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="checkbox" className="rounded" checked={editBrands.includes(b.id)}
                          onChange={(e) => setEditBrands(prev => e.target.checked ? [...prev, b.id] : prev.filter(s => s !== b.id))}
                        />
                        {b.name}
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
            <AlertDialogTitle>Delete this product name?</AlertDialogTitle>
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
