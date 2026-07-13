"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useMemo, useState, useEffect } from "react";
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
import { Switch } from "@/shared/ui/switch";
import { toast } from "sonner";
import { Download, Upload } from "lucide-react";
import Papa from "papaparse";
import type { CategoryItem } from "@/shared/api-client/categories";
import { listCategories, removeCategory } from "@/shared/api-client/categories";
import { PageHeader, EmptyState } from "@/shared/components";
import { CategoryFormDialog } from "@/features/categories/components/CategoryFormDialog";
import { ExportImportDialog } from "@/features/categories/components/ExportImportDialog";

export function CategoriesClient({
  initialCategories,
  initialBrands,
  initialProducts,
  initialModels,
  initialSeries,
  initialColors = [],
  initialStorage = [],
  initialRam = [],
  filterOnlineOnly = false,
}: {
  initialCategories: CategoryItem[];
  initialBrands: any[];
  initialProducts: any[];
  initialModels: any[];
  initialSeries: any[];
  initialColors?: any[];
  initialStorage?: any[];
  initialRam?: any[];
  filterOnlineOnly?: boolean;
}) {
  usePageTitle("Categories");
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("categories");
  const [searchQuery, setSearchQuery] = useState("");
  const [categorySearchQuery, setCategorySearchQuery] = useState("");
  
  // Debounce for Categories search
  const [debouncedCategorySearch, setDebouncedCategorySearch] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedCategorySearch(categorySearchQuery), 500);
    return () => clearTimeout(timer);
  }, [categorySearchQuery]);

  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "flat", { filterOnlineOnly }],
    queryFn: async () => {
      const data = await listCategories(true) as CategoryItem[];
      return filterOnlineOnly ? data.filter(c => c.isPublished) : data;
    },
    initialData: initialCategories,
  });

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [dialogParentId, setDialogParentId] = useState<string | null>(null);

  // Import Dialog State
  const [importOpen, setImportOpen] = useState(false);
  const [importType, setImportType] = useState("categories");

  // Catalog data
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

  const { data: allSeries = [] } = useQuery({
    queryKey: ["catalog", "series", { filterOnlineOnly }],
    queryFn: async () => {
      const res = await fetch(`/api/catalog?entity=series`);
      if (!res.ok) return [];
      const data = await res.json();
      return filterOnlineOnly ? data.filter((x: any) => x.isPublished) : data;
    },
    initialData: initialSeries,
  });

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

  const { data: allStorage = [] } = useQuery({
    queryKey: ["catalog", "storage", { filterOnlineOnly }],
    queryFn: async () => {
      const res = await fetch(`/api/catalog?entity=storage`);
      if (!res.ok) return [];
      const data = await res.json();
      return filterOnlineOnly ? data.filter((x: any) => x.isPublished) : data;
    },
    initialData: initialStorage,
  });

  const { data: allRam = [] } = useQuery({
    queryKey: ["catalog", "ram", { filterOnlineOnly }],
    queryFn: async () => {
      const res = await fetch(`/api/catalog?entity=ram`);
      if (!res.ok) return [];
      const data = await res.json();
      return filterOnlineOnly ? data.filter((x: any) => x.isPublished) : data;
    },
    initialData: initialRam,
  });

  // Edit/Delete state
  const [editingItem, setEditingItem] = useState<{ type: string, id: string, name: string } | null>(null);
  const [deleteItem, setDeleteItem] = useState<{ type: string, id: string } | null>(null);
  const [editName, setEditName] = useState("");

  type CatalogEntity = "brands" | "products" | "models" | "series" | "colors" | "storage" | "ram";
  const [createOpen, setCreateOpen] = useState(false);
  const [createEntity, setCreateEntity] = useState<CatalogEntity>("brands");
  const [createName, setCreateName] = useState<string>("");

  const deleteMut = useMutation({
    mutationFn: (id: string) => removeCategory(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
  });

  const updateItemMut = useMutation({
    mutationFn: async ({ type, id, name, isPublished }: { type: string, id: string, name: string, isPublished?: boolean }) => {
      const res = await fetch("/api/catalog", {
        method: "PUT",
        body: JSON.stringify({ entity: type, id, name, isPublished }),
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

  const toggleCategoryPublishMut = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string, isPublished: boolean }) => {
      const res = await fetch(`/api/categories/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublished }),
      });
      if (!res.ok) throw new Error("Failed to update category");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["categories"] }),
    onError: () => toast.error("Failed to update category"),
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
  
  const parents = useMemo(() => {
    let result = categories.filter(isParent);
    if (debouncedCategorySearch) {
      result = result.filter(c => c.name.toLowerCase().includes(debouncedCategorySearch.toLowerCase()));
    }
    return result;
  }, [categories, debouncedCategorySearch]);

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

  const filteredColors = useMemo(() => {
    return allColors.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allColors, searchQuery]);

  const filteredStorage = useMemo(() => {
    return allStorage.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allStorage, searchQuery]);

  const filteredRam = useMemo(() => {
    return allRam.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [allRam, searchQuery]);

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
    } else if (editingItem.type === "colors") {
      isDuplicate = allColors.some((c: any) => c.name.toLowerCase() === name.toLowerCase() && c.id !== editingItem.id);
    } else if (editingItem.type === "storage") {
      isDuplicate = allStorage.some((s: any) => s.name.toLowerCase() === name.toLowerCase() && s.id !== editingItem.id);
    } else if (editingItem.type === "ram") {
      isDuplicate = allRam.some((r: any) => r.name.toLowerCase() === name.toLowerCase() && r.id !== editingItem.id);
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
    } else if (createEntity === "colors") {
      isDuplicate = allColors.some((c: any) => c.name.toLowerCase() === name.toLowerCase());
    } else if (createEntity === "storage") {
      isDuplicate = allStorage.some((s: any) => s.name.toLowerCase() === name.toLowerCase());
    } else if (createEntity === "ram") {
      isDuplicate = allRam.some((r: any) => r.name.toLowerCase() === name.toLowerCase());
    }

    if (isDuplicate) {
      return toast.error("An item with this name already exists");
    }

    await createItemMut.mutateAsync({ entity: createEntity, name });
  };

  const handleOpenImport = (type: string) => {
    setImportType(type);
    setImportOpen(true);
  };

  const handleExport = (type: string, data: any[]) => {
    let exportData;
    if (type === "categories") {
      exportData = data.map(c => ({
        ID: c.id,
        Name: c.name,
        "Parent Category ID": c.parentId || "",
        "Parent Category Name": parents.find(p => p.id === c.parentId)?.name || "",
        "Is Published": c.isPublished ? "Yes" : "No"
      }));
    } else {
      exportData = data.map(item => ({
        ID: item.id,
        Name: item.name,
        "Is Published": item.isPublished ? "Yes" : "No"
      }));
    }

    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `${type}_export.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <TabsTrigger value="colors">Colors</TabsTrigger>
          <TabsTrigger value="storage">Storage</TabsTrigger>
          <TabsTrigger value="ram">RAM</TabsTrigger>
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
            
            <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search categories..."
                  className="pl-8"
                  value={categorySearchQuery}
                  onChange={(e) => setCategorySearchQuery(e.target.value)}
                />
              </div>
              {!filterOnlineOnly && (
                <>
                  <Button variant="outline" size="icon" title="Export Categories" onClick={() => handleExport("categories", categories)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" title="Import Categories" onClick={() => handleOpenImport("categories")}>
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => openNew(null)} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    <Plus className="h-4 w-4 mr-2" />Add
                  </Button>
                </>
              )}
            </div>
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
                      {!filterOnlineOnly && (
                        <>
                          <div className="flex items-center gap-2 px-2">
                            <Switch
                              checked={c.isPublished}
                              onCheckedChange={(val) => toggleCategoryPublishMut.mutate({ id: c.id, isPublished: val })}
                            />
                            <span className="text-xs text-muted-foreground hidden sm:inline">Web</span>
                          </div>
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
                        </>
                      )}
                    </div>
                    <CollapsibleContent>
                      {kids.length > 0 && (
                        <div className="bg-muted/30">
                          {kids.map((s) => (
                            <div key={s.id} className="flex items-center gap-2 pl-8 sm:pl-12 pr-3 sm:pr-4 py-2 border-t">
                              <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                              <p className="flex-1 min-w-0 truncate text-sm">{s.name}</p>
                              <Badge variant="outline" className="text-xs shrink-0">{s.productCount}</Badge>
                              {!filterOnlineOnly && (
                                <>
                                  <div className="flex items-center gap-2 px-2 border-l ml-2">
                                    <Switch
                                      checked={s.isPublished}
                                      onCheckedChange={(val) => toggleCategoryPublishMut.mutate({ id: s.id, isPublished: val })}
                                    />
                                    <span className="text-xs text-muted-foreground hidden sm:inline">Web</span>
                                  </div>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => openEdit(s)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0 text-destructive" onClick={() => setDeleteId(s.id)}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </>
                              )}
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
              {!filterOnlineOnly && (
                <>
                  <Button variant="outline" size="icon" title="Export Brands" onClick={() => handleExport("brands", allBrands)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" title="Import Brands" onClick={() => handleOpenImport("brands")}>
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => openCreate("brands")} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    <Plus className="h-4 w-4 mr-2" />Add Brand
                  </Button>
                </>
              )}
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
                        {!filterOnlineOnly && (
                          <>
                            <div className="flex items-center gap-2 px-2 border-r mr-1">
                              <Switch
                                checked={brand.isPublished}
                                onCheckedChange={(val) => updateItemMut.mutate({ type: "brands", id: brand.id, name: brand.name, isPublished: val })}
                              />
                              <span className="text-xs text-muted-foreground hidden sm:inline">Web</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditItem("brands", brand.id, brand.name)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteItem({ type: "brands", id: brand.id })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
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
              {!filterOnlineOnly && (
                <>
                  <Button variant="outline" size="icon" title="Export Products" onClick={() => handleExport("products", allProducts)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" title="Import Products" onClick={() => handleOpenImport("products")}>
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => openCreate("products")} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    <Plus className="h-4 w-4 mr-2" />Add Product Name
                  </Button>
                </>
              )}
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
                        {!filterOnlineOnly && (
                          <>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditItem("products", product.id, product.name)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteItem({ type: "products", id: product.id })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
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
              {!filterOnlineOnly && (
                <>
                  <Button variant="outline" size="icon" title="Export Models" onClick={() => handleExport("models", allModels)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" title="Import Models" onClick={() => handleOpenImport("models")}>
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => openCreate("models")} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    <Plus className="h-4 w-4 mr-2" />Add Model
                  </Button>
                </>
              )}
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
                        {!filterOnlineOnly && (
                          <>
                            <div className="flex items-center gap-2 px-2 border-r mr-1">
                              <Switch
                                checked={model.isPublished}
                                onCheckedChange={(val) => updateItemMut.mutate({ type: "models", id: model.id, name: model.name, isPublished: val })}
                              />
                              <span className="text-xs text-muted-foreground hidden sm:inline">Web</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditItem("models", model.id, model.name)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteItem({ type: "models", id: model.id })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
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
              {!filterOnlineOnly && (
                <>
                  <Button variant="outline" size="icon" title="Export Series" onClick={() => handleExport("series", allSeries)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" title="Import Series" onClick={() => handleOpenImport("series")}>
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => openCreate("series")} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    <Plus className="h-4 w-4 mr-2" />Add Series
                  </Button>
                </>
              )}
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
                        {!filterOnlineOnly && (
                          <>
                            <div className="flex items-center gap-2 px-2 border-r mr-1">
                              <Switch
                                checked={series.isPublished}
                                onCheckedChange={(val) => updateItemMut.mutate({ type: "series", id: series.id, name: series.name, isPublished: val })}
                              />
                              <span className="text-xs text-muted-foreground hidden sm:inline">Web</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditItem("series", series.id, series.name)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteItem({ type: "series", id: series.id })}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </>
                        )}
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

        {/* Colors Tab */}
        <TabsContent value="colors">
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
                  <Button variant="outline" size="icon" title="Export Colors" onClick={() => handleExport("colors", allColors)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" title="Import Colors" onClick={() => handleOpenImport("colors")}>
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => openCreate("colors")} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
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
                  <div key={color.id} className="flex items-center gap-2 p-3 sm:p-4">
                    {editingItem?.type === "colors" && editingItem.id === color.id ? (
                      <>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" autoFocus />
                        <LoadingButton size="sm" onClick={handleSaveEdit} loading={updateItemMut.isPending}>Save</LoadingButton>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0"><p className="font-medium truncate">{color.name}</p></div>
                        {!filterOnlineOnly && (
                          <>
                            <div className="flex items-center gap-2 px-2 border-r mr-1">
                              <Switch checked={color.isPublished} onCheckedChange={(val) => updateItemMut.mutate({ type: "colors", id: color.id, name: color.name, isPublished: val })} />
                              <span className="text-xs text-muted-foreground hidden sm:inline">Web</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditItem("colors", color.id, color.name)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteItem({ type: "colors", id: color.id })}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {allColors.length === 0 && <EmptyState icon={FolderTree} title="No colors yet" description="Click “Add Color” to create your first item." />}
            </div>
          </Card>
        </TabsContent>

        {/* Storage Tab */}
        <TabsContent value="storage">
          <Card className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
                <FolderTree className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Storage</p>
                <p className="text-2xl font-bold">{allStorage.length}</p>
              </div>
            </div>
            <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search storage..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              {!filterOnlineOnly && (
                <>
                  <Button variant="outline" size="icon" title="Export Storage" onClick={() => handleExport("storage", allStorage)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" title="Import Storage" onClick={() => handleOpenImport("storage")}>
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => openCreate("storage")} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    <Plus className="h-4 w-4 mr-2" />Add Storage
                  </Button>
                </>
              )}
            </div>
          </Card>
          <Card>
            <div className="divide-y">
              {filteredStorage.map((item: any) => {
                return (
                  <div key={item.id} className="flex items-center gap-2 p-3 sm:p-4">
                    {editingItem?.type === "storage" && editingItem.id === item.id ? (
                      <>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" autoFocus />
                        <LoadingButton size="sm" onClick={handleSaveEdit} loading={updateItemMut.isPending}>Save</LoadingButton>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0"><p className="font-medium truncate">{item.name}</p></div>
                        {!filterOnlineOnly && (
                          <>
                            <div className="flex items-center gap-2 px-2 border-r mr-1">
                              <Switch checked={item.isPublished} onCheckedChange={(val) => updateItemMut.mutate({ type: "storage", id: item.id, name: item.name, isPublished: val })} />
                              <span className="text-xs text-muted-foreground hidden sm:inline">Web</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditItem("storage", item.id, item.name)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteItem({ type: "storage", id: item.id })}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {allStorage.length === 0 && <EmptyState icon={FolderTree} title="No storage yet" description="Click “Add Storage” to create your first item." />}
            </div>
          </Card>
        </TabsContent>

        {/* RAM Tab */}
        <TabsContent value="ram">
          <Card className="p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 grid place-items-center">
                <FolderTree className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total RAM</p>
                <p className="text-2xl font-bold">{allRam.length}</p>
              </div>
            </div>
            <div className="flex gap-2 sm:ml-auto w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search RAM..." className="pl-8" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
              </div>
              {!filterOnlineOnly && (
                <>
                  <Button variant="outline" size="icon" title="Export RAM" onClick={() => handleExport("ram", allRam)}>
                    <Download className="h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="icon" title="Import RAM" onClick={() => handleOpenImport("ram")}>
                    <Upload className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => openCreate("ram")} className="bg-primary text-primary-foreground hover:bg-primary/90 shrink-0">
                    <Plus className="h-4 w-4 mr-2" />Add RAM
                  </Button>
                </>
              )}
            </div>
          </Card>
          <Card>
            <div className="divide-y">
              {filteredRam.map((item: any) => {
                return (
                  <div key={item.id} className="flex items-center gap-2 p-3 sm:p-4">
                    {editingItem?.type === "ram" && editingItem.id === item.id ? (
                      <>
                        <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="flex-1" autoFocus />
                        <LoadingButton size="sm" onClick={handleSaveEdit} loading={updateItemMut.isPending}>Save</LoadingButton>
                        <Button size="sm" variant="outline" onClick={() => setEditingItem(null)}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <div className="flex-1 min-w-0"><p className="font-medium truncate">{item.name}</p></div>
                        {!filterOnlineOnly && (
                          <>
                            <div className="flex items-center gap-2 px-2 border-r mr-1">
                              <Switch checked={item.isPublished} onCheckedChange={(val) => updateItemMut.mutate({ type: "ram", id: item.id, name: item.name, isPublished: val })} />
                              <span className="text-xs text-muted-foreground hidden sm:inline">Web</span>
                            </div>
                            <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => handleEditItem("ram", item.id, item.name)}><Pencil className="h-4 w-4" /></Button>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => setDeleteItem({ type: "ram", id: item.id })}><Trash2 className="h-4 w-4" /></Button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
              {allRam.length === 0 && <EmptyState icon={FolderTree} title="No RAM yet" description="Click “Add RAM” to create your first item." />}
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

      <ExportImportDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        type={importType}
        onImported={() => {
          queryClient.invalidateQueries({ queryKey: ["categories"] });
          queryClient.invalidateQueries({ queryKey: ["catalog"] });
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
