"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Badge } from "@/shared/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/shared/ui/alert-dialog";
import { formatCurrency, formatDateTime } from "@/shared/lib/format";
import { Search, Plus, History, Pencil, Trash2, PackagePlus, Tag, Check, X, ScanLine, Printer, ChevronRight, CornerDownRight, Boxes, Layers, Info } from "lucide-react";
import { Switch } from "@/shared/ui/switch";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/shared/ui/collapsible";
import { AdjustmentType, Product, Category, ProductCondition, StockAdjustment } from "@/shared/lib/types";
import { toast } from "sonner";
import ImageUpload from "@/components/ImageUpload";
import CameraScanner from "@/components/CameraScanner";
import { PageHeader } from "@/shared/components";
import { AutoSuggest } from "@/shared/ui/auto-suggest";
import { useAdjustments, useInventoryActions } from "@/features/inventory/hooks";
import { useInventoryMetricsQuery } from "@/features/reports/hooks";
import {
  useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct,
} from "@/features/products/hooks";
import type { CategoryItem } from "@/shared/api-client/categories";
import { listCategories, createCategory, updateCategory as updateCategoryApi, removeCategory as removeCategoryApi } from "@/shared/api-client/categories";
import { effectiveReorderPoint } from "@/features/products/bundle";
import {
  InventoryStatsCards,
  InventoryProductTable,
  InventoryProductMobileList,
  AdjustmentsHistory,
} from "@/features/inventory/components";
import { LabelPrintDialog } from "@/features/labels";
import { ProductFormDialog } from "@/features/products/ProductFormDialog";

export function InventoryClient({
  initialProducts,
  initialAdjustments,
  initialCategories,
  filterOnlineOnly = false,
}: {
  initialProducts: Product[];
  initialAdjustments: StockAdjustment[];
  initialCategories: CategoryItem[];
  filterOnlineOnly?: boolean;
}) {
  usePageTitle("Inventory");
  const { data: rawProducts = [] } = useProducts(initialProducts);
  const products = useMemo(() => {
    return filterOnlineOnly ? rawProducts.filter(p => p.isPublished) : rawProducts;
  }, [rawProducts, filterOnlineOnly]);
  const adjustments = useAdjustments(initialAdjustments);
  const { adjust } = useInventoryActions();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const { data: categories = [] } = useQuery({
    queryKey: ["categories", "flat"],
    queryFn: () => listCategories(true) as Promise<CategoryItem[]>,
    initialData: initialCategories,
  });
  
  const { data: inventoryMetrics } = useInventoryMetricsQuery({ onlineOnly: filterOnlineOnly });
  const stockValue = inventoryMetrics?.stockValue ?? 0;
  const lowCount = inventoryMetrics?.lowStock.length ?? 0;
  const outCount = products.filter(p => p.stock === 0).length; // Still doing outCount here because API returned only lowStock/deadStock

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("All");

  // Adjustment dialog
  const [adjOpen, setAdjOpen] = useState(false);
  const [adjusting, setAdjusting] = useState(false);
  const [productId, setProductId] = useState("");
  const [type, setType] = useState<AdjustmentType>("Add");
  const [qty, setQty] = useState("1");
  const [reason, setReason] = useState("");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  // Product add/edit dialog control
  const [editOpen, setEditOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [prefillBarcode, setPrefillBarcode] = useState("");
  
  // Quick price edit dialog
  const [quickPriceOpen, setQuickPriceOpen] = useState(false);
  const [priceEditing, setPriceEditing] = useState<Product | null>(null);
  const [editOnlinePrice, setEditOnlinePrice] = useState("");
  const [editComparePrice, setEditComparePrice] = useState("");
  
  const [delId, setDelId] = useState<string | null>(null);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<"new" | "form">("new");

  // Label printing
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [labelOpen, setLabelOpen] = useState(false);
  const [labelProducts, setLabelProducts] = useState<Product[]>([]);

  const openLabelsFor = (items: Product[]) => {
    if (items.length === 0) return toast.error("কোনো প্রোডাক্ট সিলেক্ট করা হয়নি");
    setLabelProducts(items);
    setLabelOpen(true);
  };
  const toggleSelect = (id: string) =>
    setSelectedIds((s) => {
      const next = new Set(s);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });

  const openScanForNew = () => { setScanTarget("new"); setScanOpen(true); };
  const openScanForForm = () => { setScanTarget("form"); setScanOpen(true); };

  const handleScanned = (code: string) => {
    setScanOpen(false);
    if (!code) return;
    if (scanTarget === "form") {
      setPrefillBarcode(code);
      toast.success(`Barcode captured: ${code}`);
      return;
    }
    const existing = products.find((p) => p.barcode === code || p.sku === code);
    if (existing) {
      toast.info(`"${existing.name}" already exists — opened for editing`);
      openEdit(existing);
    } else {
      setEditing(null);
      setPrefillBarcode(code);
      setEditOpen(true);
      toast.success(`New barcode ${code} — fill in product details`);
    }
  };

  const openNew = () => {
    setEditing(null);
    setPrefillBarcode("");
    setEditOpen(true);
  };
  const openEdit = (p: Product) => {
    setEditing(p);
    setPrefillBarcode("");
    setEditOpen(true);
  };
  
  const openQuickPrice = (p: Product) => {
    setPriceEditing(p);
    setEditOnlinePrice(p.onlinePrice != null ? String(p.onlinePrice) : "");
    setEditComparePrice(p.compareAtPrice != null ? String(p.compareAtPrice) : "");
    setQuickPriceOpen(true);
  };
  
  const confirmDelete = () => {
    if (!delId) return;
    deleteProduct.mutate(delId);
    toast.success("Product deleted");
    setDelId(null);
  };
  
  const submitQuickPrice = async () => {
    if (!priceEditing) return;
    const patch: Partial<Product> = {};
    patch.onlinePrice = editOnlinePrice ? Number(editOnlinePrice) : (null as any);
    patch.compareAtPrice = editComparePrice ? Number(editComparePrice) : (null as any);
    
    updateProduct.mutate({ id: priceEditing.id, patch });
    setQuickPriceOpen(false);
  };

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const reorder = effectiveReorderPoint(p);
      const matchesFilter =
        filter === "All" ||
        (filter === "Low" && p.stock > 0 && p.stock <= reorder) ||
        (filter === "Out" && p.stock === 0) ||
        (filter === "OK" && p.stock > reorder) ||
        (filter === "Reorder" && p.type !== "bundle" && p.stock <= reorder);
      const q = search.toLowerCase();
      const matchesSearch =
        (p.name || "").toLowerCase().includes(q) || 
        (p.sku || "").toLowerCase().includes(q) ||
        (p.brand || "").toLowerCase().includes(q) ||
        (p.model || "").toLowerCase().includes(q) ||
        (p.category || "").toLowerCase().includes(q);
      return matchesFilter && matchesSearch;
    });
  }, [products, search, filter]);

  const isFilterEmpty = !search.trim() && filter === "All";
  const displayedProducts = isFilterEmpty ? filtered.slice(0, 5) : filtered;



  // Category management
  const [newCatName, setNewCatName] = useState("");
  const [newSubParentId, setNewSubParentId] = useState<string>("");
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>({});

  const isParentCat = (c: typeof categories[number]) => !c.parentId || c.parentId === c.id;
  const parentCats = useMemo(
    () => categories.filter(isParentCat).sort((a, b) => a.name.localeCompare(b.name)),
    [categories]
  );
  const subCatsOf = (pid: string) =>
    categories.filter((c) => c.parentId === pid && c.id !== pid).sort((a, b) => a.name.localeCompare(b.name));

  const handleAddCategory = () => {
    const name = newCatName.trim();
    if (!name) return toast.error("Category name required");
    const parentId = newSubParentId || null;
    const dup = categories.some(
      (c) => (c.parentId ?? null) === parentId && c.name.toLowerCase() === name.toLowerCase()
    );
    if (dup) return toast.error("Category already exists");
    createCategory({ name, parentId: parentId ?? undefined });
    setNewCatName("");
    setNewSubParentId("");
    toast.success(parentId ? "Sub-category added" : "Category added");
    if (parentId) setExpandedCats((s) => ({ ...s, [parentId]: true }));
  };
  const handleRename = (id: string) => {
    const name = renameValue.trim();
    if (!name) return toast.error("Name required");
    const old = categories.find((c) => c.id === id);
    if (!old) return;
    if (categories.some((c) => c.id !== id && c.name.toLowerCase() === name.toLowerCase())) {
      return toast.error("Name already used");
    }
    updateCategoryApi(id, { name });
    // cascade rename to products that referenced the old name
    products.filter((p) => p.category === old.name).forEach((p) => updateProduct.mutate({ id: p.id, patch: { category: name as Category } }));
    setRenameId(null);
    setRenameValue("");
    toast.success("Category renamed");
  };
  const toggleCategoryActive = (_id: string, active: boolean) => {
    toast.success(active ? "Category enabled" : "Category disabled");
  };
  const removeCategory = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    if (!cat) return;
    const inUse = products.some((p) => p.category === cat.name);
    if (inUse) return toast.error("Cannot delete: products are using this category. Disable it instead.");
    removeCategoryApi(id);
    toast.success("Category deleted");
  };

  const submitAdjust = async () => {
    setAdjusting(true);
    const q = Number(qty);
    if (!productId) { setAdjusting(false); return toast.error("Select a product"); }
    if (!q || q < 0) { setAdjusting(false); return toast.error("Enter a valid quantity"); }
    if (!reason.trim()) { setAdjusting(false); return toast.error("Reason is required"); }
    try {
      await adjust({ productId, type, qty: q, reason, reference: reference.trim() || undefined, note });
      toast.success("Stock adjusted & history updated");
      setAdjOpen(false);
      setProductId(""); setQty("1"); setReason(""); setReference(""); setNote(""); setType("Add");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Adjustment failed");
    } finally {
      setAdjusting(false);
    }
  };

  const renderTabsList = () => (
    <TabsList className="bg-gray-50/50 border border-gray-100 p-1 h-auto flex-wrap justify-start">
      <TabsTrigger value="overview" className="px-4 py-1.5 text-sm">Overview</TabsTrigger>
      {!filterOnlineOnly && (
        <>
          <TabsTrigger value="categories" className="px-4 py-1.5 text-sm"><Tag className="h-3.5 w-3.5 mr-1" />Categories</TabsTrigger>
          <TabsTrigger value="adjustments" className="px-4 py-1.5 text-sm"><History className="h-3.5 w-3.5 mr-1" />Adjustments</TabsTrigger>
        </>
      )}
    </TabsList>
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 sm:gap-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-900 via-slate-800 to-indigo-950 p-4 sm:p-5 shadow-xl xl:col-span-1 flex flex-col justify-center">
          <div className="absolute inset-0 bg-[url('/noise.svg')] opacity-10 mix-blend-overlay" />
          <div className="absolute -top-10 -right-10 h-40 w-40 bg-indigo-500/20 blur-[60px] rounded-full" />
          <div className="relative z-10">
            <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white mb-2 relative z-10 flex items-center gap-2">
              <Layers className="h-5 w-5 text-indigo-300" />
              {filterOnlineOnly ? "E-commerce Catalog" : "Inventory Command Center"}
            </h1>
            <p className="text-xs sm:text-sm text-indigo-100/90 relative z-10 leading-relaxed font-medium">
              {filterOnlineOnly 
                ? "Manage published products and track availability."
                : "Track stock value, categories, and audit adjustments."}
            </p>
          </div>
        </div>

        <div className="xl:col-span-3">
          <InventoryStatsCards stockValue={stockValue} lowCount={lowCount} outCount={outCount} />
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsContent value="overview" className="space-y-4 m-0">
          <Card className="p-2 sm:p-3 flex flex-col xl:flex-row gap-2 sm:gap-3 items-start xl:items-center">
            {renderTabsList()}
            <div className="h-4 w-px bg-border hidden xl:block" />
            <div className="flex-1 flex flex-col sm:flex-row w-full gap-2 sm:gap-3">
              <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name, SKU, brand, or category…" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9 h-10" />
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="sm:w-44 h-10"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All stock</SelectItem>
                <SelectItem value="OK">Healthy</SelectItem>
                <SelectItem value="Low">Low stock</SelectItem>
                <SelectItem value="Reorder">Needs reorder</SelectItem>
                <SelectItem value="Out">Out of stock</SelectItem>
              </SelectContent>
            </Select>
            {!filterOnlineOnly && (
              <>
                <Button variant="outline" onClick={openScanForNew} title="Scan barcode to add product" className="h-10 hidden sm:inline-flex">
                  <ScanLine className="h-4 w-4 mr-2" />Scan
                </Button>
                <Button variant="outline" onClick={openNew} className="h-10">
                  <PackagePlus className="h-4 w-4 mr-2" /><span className="hidden sm:inline">Add Product</span><span className="sm:hidden">Add</span>
                </Button>
              </>
            )}
            {!filterOnlineOnly && (
              <Button onClick={() => setAdjOpen(true)} className="bg-primary text-primary-foreground hover:bg-primary/90 h-10">
                <Plus className="h-4 w-4 mr-2" /><span className="hidden sm:inline">New Adjustment</span><span className="sm:hidden">Adjust</span>
              </Button>
              )}
            </div>
          </Card>

          {/* Mobile floating scan button */}
          {!filterOnlineOnly && (
            <button
              type="button"
              onClick={openScanForNew}
              className="md:hidden fixed right-4 z-20 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-sm grid place-items-center active:scale-95 transition-colors"
              style={{ bottom: "calc(5rem + env(safe-area-inset-bottom))" }}
              aria-label="Scan barcode"
            >
              <ScanLine className="h-6 w-6" />
            </button>
          )}

          {/* Bulk action bar */}
          {selectedIds.size > 0 && (
            <Card className="p-3 flex items-center justify-between gap-2 border-slate-200 bg-slate-50">
              <span className="text-sm">
                <span className="font-semibold">{selectedIds.size}</span> selected
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear
                </Button>
                <Button
                  size="sm"
                  onClick={() =>
                    openLabelsFor(filtered.filter((p) => selectedIds.has(p.id)))
                  }
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print Labels
                </Button>
              </div>
            </Card>
          )}

          <InventoryProductMobileList
            products={displayedProducts}
            onQuickAdjust={(id) => { setProductId(id); setType("Add"); setAdjOpen(true); }}
            onEdit={openEdit}
            onDelete={(id) => setDelId(id)}
            onPrintLabel={(p) => openLabelsFor([p])}
            onQuickEditPrice={openQuickPrice}
            isOnlineInventory={filterOnlineOnly}
          />

          <InventoryProductTable
            products={displayedProducts}
            onQuickAdjust={(id) => { setProductId(id); setType("Add"); setAdjOpen(true); }}
            onEdit={openEdit}
            onDelete={(id) => setDelId(id)}
            onPrintLabel={(p) => openLabelsFor([p])}
            onQuickEditPrice={openQuickPrice}
            isOnlineInventory={filterOnlineOnly}
            selectedIds={selectedIds}
            onToggleSelect={toggleSelect}
            onToggleAll={(all) =>
              setSelectedIds(all ? new Set(filtered.map((p) => p.id)) : new Set())
            }
          />

        </TabsContent>

        <TabsContent value="categories" className="space-y-4 m-0">
          <Card className="p-2 sm:p-3 flex flex-col xl:flex-row gap-2 sm:gap-3 items-start xl:items-center">
            {renderTabsList()}
            <div className="h-4 w-px bg-border hidden xl:block" />
            <div className="flex-1 flex flex-col sm:flex-row w-full gap-2">
              <Select value={newSubParentId || "__root__"} onValueChange={(v) => setNewSubParentId(v === "__root__" ? "" : v)}>
                <SelectTrigger className="sm:w-56"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__root__">+ New main category</SelectItem>
                  {parentCats.map((p) => (
                    <SelectItem key={p.id} value={p.id}>Sub of: {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder={newSubParentId ? "New sub-category name…" : "New category name…"}
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                className="flex-1"
              />
              <Button onClick={handleAddCategory} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-2" />Add
              </Button>
            </div>
          </Card>

          <Card>
            <div className="divide-y">
              {parentCats.map((c) => {
                const kids = subCatsOf(c.id);
                const isOpen = expandedCats[c.id] ?? false;
                const count = products.filter((p) => p.category === c.name).length;
                const isActive = true;
                const isRenaming = renameId === c.id;
                return (
                  <Collapsible
                    key={c.id}
                    open={isOpen}
                    onOpenChange={(o) => setExpandedCats((s) => ({ ...s, [c.id]: o }))}
                  >
                    <div className="flex items-center gap-2 p-3 sm:p-4 hover:bg-secondary/40">
                      <CollapsibleTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7" disabled={kids.length === 0}>
                          <ChevronRight className={`h-4 w-4 transition-transform ${isOpen ? "rotate-90" : ""} ${kids.length === 0 ? "opacity-30" : ""}`} />
                        </Button>
                      </CollapsibleTrigger>
                      <Tag className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        {isRenaming ? (
                          <Input
                            autoFocus
                            value={renameValue}
                            onChange={(e) => setRenameValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleRename(c.id);
                              if (e.key === "Escape") { setRenameId(null); setRenameValue(""); }
                            }}
                            className="max-w-xs h-8"
                          />
                        ) : (
                          <>
                            <p className="font-medium truncate">{c.name}</p>
                            <p className="text-xs text-muted-foreground">{kids.length} sub · {count} products</p>
                          </>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {/* Status is now automated based on product publication */}
                        <span className="text-xs text-muted-foreground hidden sm:inline">Auto-Published</span>
                      </div>
                      {isRenaming ? (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => handleRename(c.id)}><Check className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => { setRenameId(null); setRenameValue(""); }}><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <>
                          <Button size="icon" variant="ghost" onClick={() => { setRenameId(c.id); setRenameValue(c.name); }}><Pencil className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" className="text-destructive" onClick={() => removeCategory(c.id)}><Trash2 className="h-4 w-4" /></Button>
                        </>
                      )}
                    </div>
                    <CollapsibleContent>
                      {kids.length > 0 && (
                        <div className="bg-muted/30">
                          {kids.map((s) => {
                            const sCount = products.filter((p) => p.subcategory === s.name || p.category === s.name).length;
                            const sActive = true;
                            const sRenaming = renameId === s.id;
                            return (
                              <div key={s.id} className="flex items-center gap-2 pl-10 pr-3 sm:pr-4 py-2 border-t">
                                <CornerDownRight className="h-3.5 w-3.5 text-muted-foreground" />
                                <div className="flex-1 min-w-0">
                                  {sRenaming ? (
                                    <Input
                                      autoFocus
                                      value={renameValue}
                                      onChange={(e) => setRenameValue(e.target.value)}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") handleRename(s.id);
                                        if (e.key === "Escape") { setRenameId(null); setRenameValue(""); }
                                      }}
                                      className="h-7 max-w-xs"
                                    />
                                  ) : (
                                    <p className="text-sm truncate">{s.name} <span className="text-xs text-muted-foreground">({sCount})</span></p>
                                  )}
                                </div>
                                {sRenaming ? (
                                  <>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => handleRename(s.id)}><Check className="h-3.5 w-3.5" /></Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setRenameId(null); setRenameValue(""); }}><X className="h-3.5 w-3.5" /></Button>
                                  </>
                                ) : (
                                  <>
                                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setRenameId(s.id); setRenameValue(s.name); }}><Pencil className="h-3.5 w-3.5" /></Button>
                                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => removeCategory(s.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                                  </>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
              {parentCats.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">No categories yet.</div>
              )}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="adjustments" className="space-y-4 m-0">
          <Card className="p-2 sm:p-3 flex flex-col xl:flex-row gap-2 sm:gap-3 items-start xl:items-center">
            {renderTabsList()}
          </Card>
          <AdjustmentsHistory adjustments={adjustments} />
        </TabsContent>
      </Tabs>

      {/* Adjustment Dialog */}
      <Dialog open={adjOpen} onOpenChange={setAdjOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Stock Adjustment</DialogTitle>
            <DialogDescription>Record a change to stock with a reason for audit trail.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Field label="Product">
              <AutoSuggest
                value={productId}
                onValueChange={setProductId}
                options={products.map((p) => ({
                  value: p.id,
                  label: p.name,
                  badge: p.stock != null ? `Stock: ${p.stock}` : undefined,
                }))}
                placeholder="Search product…"
                emptyMessage="No product found"
                debounceMs={200}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Type">
                <Select value={type} onValueChange={(v) => setType(v as AdjustmentType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Add">Add</SelectItem>
                    <SelectItem value="Remove">Remove</SelectItem>
                    <SelectItem value="Set">Set to</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Quantity">
                <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} />
              </Field>
            </div>
            <Field label="Reason">
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger><SelectValue placeholder="Pick a reason" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Damaged">Damaged</SelectItem>
                  <SelectItem value="Expired">Expired</SelectItem>
                  <SelectItem value="Found">Found / Recount</SelectItem>
                  <SelectItem value="Lost">Lost / Theft</SelectItem>
                  <SelectItem value="Return to supplier">Return to supplier</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </Field>
            <Field label="Reference (PO #, invoice, doc no.)">
              <Input value={reference} onChange={(e) => setReference(e.target.value)} placeholder="e.g. PO-2024-0042 or DMG-0091" />
            </Field>
            <Field label="Note">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional details" />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjOpen(false)}>Cancel</Button>
            <LoadingButton className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={submitAdjust} loading={adjusting}>
              Save Adjustment
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Product Add/Edit Dialog */}
      <ProductFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        editing={editing}
        prefillBarcode={prefillBarcode}
        onScanRequest={openScanForForm}
      />

      {/* Quick Price Edit Dialog */}
      <Dialog open={quickPriceOpen} onOpenChange={setQuickPriceOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Quick Price Edit</DialogTitle>
            <DialogDescription>
              {priceEditing?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Field label="Online Sell Price">
              <Input type="number" value={editOnlinePrice} onChange={(e) => setEditOnlinePrice(e.target.value)} placeholder="e.g. 500" autoFocus />
            </Field>
            <Field label="Compare At Price (Strikethrough)">
              <Input type="number" value={editComparePrice} onChange={(e) => setEditComparePrice(e.target.value)} placeholder="e.g. 600" />
            </Field>
          </div>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setQuickPriceOpen(false)}>Cancel</Button>
            <LoadingButton className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={submitQuickPrice} loading={updateProduct.isPending}>
              Save
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the product from inventory. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <CameraScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={handleScanned}
      />

      <LabelPrintDialog
        open={labelOpen}
        onOpenChange={setLabelOpen}
        products={labelProducts}
      />
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-sm font-medium mb-1.5 block">{label}</label>
      {children}
    </div>
  );
}
