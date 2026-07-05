"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/shared/ui/card";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Badge } from "@/shared/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/shared/ui/dialog";
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from "@/shared/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { Plus, Pencil, Trash2, FolderTree, CornerDownRight, ChevronRight, Search } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { Input } from "@/shared/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Label } from "@/shared/ui/label";
import { toast } from "sonner";
import type { CategoryItem } from "@/shared/api-client/categories";
import { listCategories, removeCategory } from "@/shared/api-client/categories";
import { PageHeader, EmptyState } from "@/shared/components";
import { CategoryFormDialog } from "@/features/categories/components/CategoryFormDialog";

export function CategoriesClient({
  initialCategories,
  initialBrands,
  initialProducts,
  initialModels,
  initialSeries,
}: {
  initialCategories: CategoryItem[];
  initialBrands: any[];
  initialProducts: any[];
  initialModels: any[];
  initialSeries: any[];
}) {
  usePageTitle("Categories");
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("categories");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "flat"],
    queryFn: () => listCategories(true) as Promise<CategoryItem[]>,
    initialData: initialCategories,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialogParentId, setDialogParentId] = useState<string | null>(null);

  // Catalog data
  const { data: allBrands = [] } = useQuery({
    queryKey: ["catalog", "brands"],
    queryFn: async () => {
      const res = await fetch(`/api/catalog?entity=brands`);
      if (!res.ok) return [];
      return res.json();
    },
    initialData: initialBrands,
  });

  const { data: allProducts = [] } = useQuery({
    queryKey: ["catalog", "products"],
    queryFn: async () => {
      const res = await fetch(`/api/catalog?entity=products`);
      if (!res.ok) return [];
      return res.json();
    },
    initialData: initialProducts,
  });

  const { data: allModels = [] } = useQuery({
    queryKey: ["catalog", "models"],
    queryFn: async () => {
      const res = await fetch(`/api/catalog?entity=models`);
      if (!res.ok) return [];
      return res.json();
    },
    initialData: initialModels,
  });

  const { data: allSeries = [] } = useQuery({
    queryKey: ["catalog", "series"],
    queryFn: async () => {
      const res = await fetch(`/api/catalog?entity=series`);
      if (!res.ok) return [];
      return res.json();
    },
    initialData: initialSeries,
  });

  // Edit/Delete state
  const [editingItem, setEditingItem] = useState<{ type: string, id: string, name: string } | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ type: string, id: string } | null>(null);
  const [editName, setEditName] = useState("");

  type CatalogEntity = "brands" | "products" | "models" | "series";
  const [createOpen, setCreateOpen] = useState(false);
  const [createEntity, setCreateEntity] = useState<CatalogEntity>("brands");
  const [createName, setCreateName] = useState<string>("");

  const deleteMut = useMutation({
    mutationFn: (id: string) => removeCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const updateItemMut = useMutation({
    mutationFn: async ({ type, id, name }: { type: string, id: string, name: string }) => {
      const res = await fetch("/api/catalog", {
        method: "PUT",
        body: JSON.stringify({ entity: type, id, name }),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Updated");
      setEditingItem(null);
    },
    onError: () => toast.error("Failed to update"),
  });

  const deleteItemMut = useMutation({
    mutationFn: async ({ type, id }: { type: string, id: string }) => {
      const res = await fetch(`/api/catalog?entity=${type}&id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Deleted");
      setDeleteItem(null);
    },
    onError: () => toast.error("Failed to delete"),
  });

  const createItemMut = useMutation({
    mutationFn: async ({ entity, name }: { entity: CatalogEntity; name: string }) => {
      const payload: any = { entity, name };
      const res = await fetch("/api/catalog", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.message || "Failed to create");
      return json;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      toast.success("Created");
      setCreateOpen(false);
      setCreateName("");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Failed to create"),
  });

  const isParent = (c: CategoryItem) => !c.parentId || c.parentId === c.id;
  const parents = categories.filter(isParent);
  const subcategories = useMemo(() => categories.filter((c) => !!c.parentId && c.parentId !== c.id), [categories]);
  const categoryById = useMemo(() => new Map<string, CategoryItem>(categories.map((c) => [c.id, c])), [categories]);
  const brandById = useMemo(() => new Map<string, any>(allBrands.map((b: any) => [b.id, b])), [allBrands]);
  const productNameById = useMemo(() => new Map<string, any>(allProducts.map((p: any) => [p.id, p])), [allProducts]);
  const modelById = useMemo(() => new Map<string, any>(allModels.map((m: any) => [m.id, m])), [allModels]);

  const [modelProductFilter, setModelProductFilter] = useState("all");

  const filteredBrands = useMemo(() => {
    return allBrands.filter((b: any) => b.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allBrands, searchQuery]);

  const filteredProducts = useMemo(() => {
    return allProducts.filter((p: any) => p.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allProducts, searchQuery]);

  const filteredModels = useMemo(() => {
    let result = allModels;
    if (modelProductFilter !== "all") {
      result = result.filter((m: any) => m.productId === modelProductFilter);
    }
    if (searchQuery) {
      result = result.filter((m: any) => m.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return result;
  }, [allModels, modelProductFilter, searchQuery]);

  const filteredSeries = useMemo(() => {
    return allSeries.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allSeries, searchQuery]);

  const childrenOf = (pid: string) =>
    categories.filter((c) => c.parentId === pid && c.id !== pid);

  const openNew = (preselectParent: string | null = null) => {
    setEditing(null);
    setDialogParentId(preselectParent);
    setOpen(true);
  };

  const openEdit = (c: CategoryItem) => {
    setEditing(c);
    setDialogParentId(c.parentId);
    setOpen(true);
  };

  const handleEditItem = (type: string, id: string, name: string) => {
    setEditingItem({ type, id, name });
    setEditName(name);
  };

  const handleSaveEdit = async () => {
    if (!editingItem || !editName.trim()) return;

    const name = editName.trim();
    let isDuplicate = false;
    
    if (editingItem.type === "brands") {
      isDuplicate = allBrands.some((b: any) => b.name.toLowerCase() === name.toLowerCase() && b.id !== editingItem.id);
    } else if (editingItem.type === "products") {
      isDuplicate = allProducts.some((p: any) => p.name.toLowerCase() === name.toLowerCase() && p.id !== editingItem.id);
    } else if (editingItem.type === "models") {
      isDuplicate = allModels.some((m: any) => m.name.toLowerCase() === name.toLowerCase() && m.id !== editingItem.id);
    } else if (editingItem.type === "series") {
      isDuplicate = allSeries.some((s: any) => s.name.toLowerCase() === name.toLowerCase() && s.id !== editingItem.id);
    }

    if (isDuplicate) {
      return toast.error("An item with this name already exists");
    }

    await updateItemMut.mutateAsync({ type: editingItem.type, id: editingItem.id, name });
  };

  const handleDeleteItem = async () => {
    if (!deleteItem) return;
    await deleteItemMut.mutateAsync({ type: deleteItem.type, id: deleteItem.id });
  };

  const openCreate = (entity: CatalogEntity) => {
    setCreateEntity(entity);
    setCreateName("");
    setCreateOpen(true);
  };

  const handleCreate = async () => {
    const name = createName.trim();
    if (!name) return toast.error("Name is required");

    let isDuplicate = false;
    if (createEntity === "brands") {
      isDuplicate = allBrands.some((b: any) => b.name.toLowerCase() === name.toLowerCase());
    } else if (createEntity === "products") {
      isDuplicate = allProducts.some((p: any) => p.name.toLowerCase() === name.toLowerCase());
    } else if (createEntity === "models") {
      isDuplicate = allModels.some((m: any) => m.name.toLowerCase() === name.toLowerCase());
    } else if (createEntity === "series") {
      isDuplicate = allSeries.some((s: any) => s.name.toLowerCase() === name.toLowerCase());
    }

    if (isDuplicate) {
      return toast.error("An item with this name already exists");
    }

    await createItemMut.mutateAsync({ entity: createEntity, name });
  };



  return (
    <div className="space-y-4">
      <PageHeader
        title="Categories & Catalog"
        description="Manage categories, sub-categories, brands, product names, models, and series."
      />

      <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSearchQuery(""); }}>
        <TabsList>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="brands">Brands</TabsTrigger>
          <TabsTrigger value="products">Product Names</TabsTrigger>
          <TabsTrigger value="models">Models</TabsTrigger>
          <TabsTrigger value="series">Series</TabsTrigger>
        </TabsList>

        {/* Categories Tab */}
        <TabsContent value="categories">
          <Card className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
                <FolderTree className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Categories</p>
                <p className="text-2xl font-bold">{parents.length}</p>
              </div>
            </div>
            <Button onClick={() => openNew(null)} className="sm:ml-auto bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />Add Category
            </Button>
          </Card>

          <Card>
            <div className="divide-y">
              {parents.map((c) => {
                const kids = childrenOf(c.id);
                const isOpen = expanded[c.id] ?? false;
                return (
                  <Collapsible
                    key={c.id}
                    open={isOpen}
                    onOpenChange={(o) => setExpanded((s) => ({ ...s, [c.id]: o }))}
                  >
                    <div className="flex items-center gap-2 p-3 sm:p-4 hover:bg-secondary/40">
                      <CollapsibleTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" disabled={kids.length === 0}>
                          <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""} ${kids.length === 0 ? "opacity-30" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{c.name}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {kids.length} sub · {c.productCount} products
                        </p>
                      </div>
                      <Badge variant="secondary" className="hidden md:inline-flex shrink-0">{c.productCount} products</Badge>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="sm" variant="outline" className="px-2 sm:px-3" onClick={() => openNew(c.id)}>
                          <Plus className="h-3.5 w-3.5 sm:mr-1" /><span className="hidden sm:inline">Sub</span>
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => setDeleteId(c.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <CollapsibleContent>
                      {kids.length > 0 && (
                        <div className="bg-muted/30">
                          {kids.map((s) => (
                            <div key={s.id} className="flex items-center gap-2 pl-8 sm:pl-12 pr-3 sm:pr-4 py-2 border-t">
                              <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <p className="flex-1 min-w-0 truncate text-sm">{s.name}</p>
                              <Badge variant="outline" className="text-xs shrink-0">{s.productCount}</Badge>
                              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => openEdit(s)}>
                                <Pencil className="h-3.5 w-3.5" />
                              </Button>
                              <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => setDeleteId(s.id)}>
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
              {parents.length === 0 && (
                <EmptyState
                  icon={FolderTree}
                  title="No categories yet"
                  description="Add your first category to start organizing products."
                />
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Brands Tab */}
        <TabsContent value="brands">
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
                <Input
                  placeholder="Search brands..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={() => openCreate("brands")} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Plus className="h-4 w-4 mr-2" />Add Brand
              </Button>
            </div>
          </Card>

          <Card>
            <div className="divide-y">
              {filteredBrands.map((brand: any) => {
                return (
                  <div key={brand.id} className="flex items-center gap-2 p-3 sm:p-4 hover:bg-secondary/20 transition-colors">
                    {editingItem?.type === "brands" && editingItem.id === brand.id ? (
                      <>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" autoFocus />
                        <LoadingButton size="sm" onClick={handleSaveEdit} loading={updateItemMut.isPending}>Save</LoadingButton>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{brand.name}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditItem("brands", brand.id, brand.name)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteItem({ type: "brands", id: brand.id })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
              {allBrands.length === 0 && (
                <EmptyState
                  icon={FolderTree}
                  title="No brands yet"
                  description="Click “Add Brand” to create your first brand."
                />
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Products Tab */}
        <TabsContent value="products">
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
                <Input
                  placeholder="Search products..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={() => openCreate("products")} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Plus className="h-4 w-4 mr-2" />Add Product Name
              </Button>
            </div>
          </Card>

          <Card>
            <div className="divide-y">
              {filteredProducts.map((product: any) => {
                return (
                  <div key={product.id} className="flex items-center gap-2 p-3 sm:p-4 hover:bg-secondary/20 transition-colors">
                    {editingItem?.type === "products" && editingItem.id === product.id ? (
                      <>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" autoFocus />
                        <LoadingButton size="sm" onClick={handleSaveEdit} loading={updateItemMut.isPending}>Save</LoadingButton>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{product.name}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditItem("products", product.id, product.name)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteItem({ type: "products", id: product.id })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
              {allProducts.length === 0 && (
                <EmptyState
                  icon={FolderTree}
                  title="No product names yet"
                  description="Click “Add Product Name” to create your first item."
                />
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Models Tab */}
        <TabsContent value="models">
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
                  {allProducts.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => openCreate("models")} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Plus className="h-4 w-4 mr-2" />Add Model
              </Button>
            </div>
          </Card>

          <Card>
            <div className="divide-y">
              {filteredModels.map((model: any) => {
                return (
                  <div key={model.id} className="flex items-center gap-2 p-3 sm:p-4">
                    {editingItem?.type === "models" && editingItem.id === model.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1"
                          autoFocus
                        />
                        <LoadingButton size="sm" onClick={handleSaveEdit} loading={updateItemMut.isPending}>Save</LoadingButton>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{model.name}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditItem("models", model.id, model.name)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteItem({ type: "models", id: model.id })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
              {filteredModels.length === 0 && (
                <EmptyState
                  icon={FolderTree}
                  title="No models yet"
                  description="Click “Add Model” to create your first item."
                />
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Series Tab */}
        <TabsContent value="series">
          <Card className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
                <FolderTree className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Series</p>
                <p className="text-2xl font-bold">{allSeries.length}</p>
              </div>
            </div>
            <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search series..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button onClick={() => openCreate("series")} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                <Plus className="h-4 w-4 mr-2" />Add Series
              </Button>
            </div>
          </Card>

          <Card>
            <div className="divide-y">
              {filteredSeries.map((series: any) => {
                return (
                  <div key={series.id} className="flex items-center gap-2 p-3 sm:p-4">
                    {editingItem?.type === "series" && editingItem.id === series.id ? (
                      <>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="flex-1"
                          autoFocus
                        />
                        <LoadingButton size="sm" onClick={handleSaveEdit} loading={updateItemMut.isPending}>Save</LoadingButton>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{series.name}</p>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditItem("series", series.id, series.name)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteItem({ type: "series", id: series.id })}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                );
              })}
              {allSeries.length === 0 && (
                <EmptyState
                  icon={FolderTree}
                  title="No series yet"
                  description="Click “Add Series” to create your first item."
                />
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>

      <CategoryFormDialog
        open={open}
        onOpenChange={setOpen}
        mode={editing ? "edit" : dialogParentId ? "sub" : "main"}
        editingCategory={editing}
        parentName={dialogParentId ? parents.find((p) => p.id === dialogParentId)?.name : editing?.parentId ? parents.find((p) => p.id === editing.parentId)?.name : undefined}
        onCreated={() => {
          queryClient.invalidateQueries({ queryKey: ["categories"] });
          if (dialogParentId) {
            setExpanded((s) => ({ ...s, [dialogParentId]: true }));
          }
        }}
      />

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {createEntity === "brands"
                ? "Add Brand"
                : createEntity === "products"
                ? "Add Product Name"
                : createEntity === "models"
                ? "Add Model"
                : "Add Series"}
            </DialogTitle>
            <DialogDescription>
              Create a new global catalog item.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">

            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input value={createName} onChange={(e) => setCreateName(e.target.value)} autoFocus />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createItemMut.isPending}>Cancel</Button>
            <LoadingButton className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleCreate} loading={createItemMut.isPending}>Save</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this category?</AlertDialogTitle>
            <AlertDialogDescription>All sub-categories under it will also be removed. Products keep their existing label.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMut.isPending}
              onClick={async () => {
                if (deleteId) {
                  try {
                    await deleteMut.mutateAsync(deleteId);
                    toast.success("Category deleted");
                  } catch {
                    toast.error("Could not delete");
                  }
                  setDeleteId(null);
                }
              }}
              className="bg-destructive text-destructive-foreground"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Item Dialog */}
      <AlertDialog open={!!deleteItem} onOpenChange={(o) => !o && setDeleteItem(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteItemMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteItemMut.isPending}
              onClick={handleDeleteItem}
              className="bg-destructive text-destructive-foreground"
            >Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
