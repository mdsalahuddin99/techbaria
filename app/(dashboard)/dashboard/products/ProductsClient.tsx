"use client";

import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/shared/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { productDisplayName } from "@/shared/lib/format";
import { categoryName } from "@/shared/lib/categoryName";
import { Plus, Search, Pencil, Trash2, Settings2, X, ScanLine, PackageOpen, MoreHorizontal } from "lucide-react";
import { Product, Category } from "@/shared/lib/types";
import { toast } from "sonner";
import Image from "next/image";
import dynamic from "next/dynamic";
const CameraScanner = dynamic(() => import("@/components/CameraScanner"), { ssr: false });

import { PageHeader, EmptyState, ConfirmDialog } from "@/shared/components";
import type { CategoryItem } from "@/shared/api-client/categories";
import { listCategories } from "@/shared/api-client/categories";
import { useProducts, useDeleteProduct, useUpdateProduct, useBulkUpdateProducts, useBulkDeleteProducts, useInfiniteProductsQuery } from "@/features/products/hooks";
import { ProductFormDialog } from "@/features/products/ProductFormDialog";
import { ProductDetailsDialog } from "@/features/products/components/ProductDetailsDialog";
import { BulkEditDialog, initialBulkState, type BulkState } from "@/features/products/components";

export function ProductsClient({
  initialProducts,
  initialCategories,
}: {
  initialProducts: Product[];
  initialCategories: CategoryItem[];
}) {
  usePageTitle("Products");
  const deleteMutation = useDeleteProduct();
  const updateMutation = useUpdateProduct();
  const bulkUpdateMutation = useBulkUpdateProducts();
  const bulkDeleteMutation = useBulkDeleteProducts();
  // updateMutation kept for potential future use from inventory page
  
  const { data: storeCategories = initialCategories } = useQuery({
    queryKey: ["categories", "flat"],
    queryFn: () => listCategories(true) as Promise<CategoryItem[]>,
    initialData: initialCategories,
  });
  

  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [filter, setFilter] = useState<string>("All");
  
  // Use debounced search for the API query
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const queryFilter = useMemo(() => ({
    search: debouncedSearch.trim() || undefined,
    categoryId: filter !== "All" ? filter : undefined,
    lowStock: lowStockOnly || undefined,
  }), [debouncedSearch, filter, lowStockOnly]);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isLoading } = useInfiniteProductsQuery(queryFilter);

  const products = useMemo(() => {
    let result = data?.pages.flatMap((page) => page.items) ?? initialProducts;

    // Apply local filter for instant feedback while server fetches
    if (queryFilter.search) {
      const s = queryFilter.search.toLowerCase();
      result = result.filter(
        (p) => {
          const catName = (storeCategories.find(c => c.id === p.category)?.name || categoryName(p.category))?.toLowerCase() || "";
          return (
            (p.name && p.name.toLowerCase().includes(s)) ||
            (p.sku && p.sku.toLowerCase().includes(s)) ||
            (p.barcode && p.barcode.toLowerCase().includes(s)) ||
            (p.serialNumber && p.serialNumber.toLowerCase().includes(s)) ||
            (p.subcategory && p.subcategory.toLowerCase().includes(s)) ||
            (p.brand && p.brand.toLowerCase().includes(s)) ||
            (p.model && p.model.toLowerCase().includes(s)) ||
            catName.includes(s)
          );
        }
      );
    }
    if (queryFilter.categoryId) {
      const selectedCat = storeCategories.find(c => c.id === queryFilter.categoryId);
      result = result.filter((p) => {
        if (p.category === queryFilter.categoryId) return true;
        if (selectedCat && p.subcategory && p.subcategory.toLowerCase() === selectedCat.name.toLowerCase()) return true;
        return false;
      });
    }
    if (queryFilter.lowStock) {
      result = result.filter((p) => p.stock <= p.minStock);
    }

    return result;
  }, [data, initialProducts, queryFilter]);

  const [editing, setEditing] = useState<Product | null>(null);
  const [open, setOpen] = useState(false);
  const [prefillBarcode, setPrefillBarcode] = useState<string>("");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [scanTarget, setScanTarget] = useState<"new" | "form">("new");
  const [bulk, setBulk] = useState<BulkState>(initialBulkState);

  // We no longer need local filtered calculation because it's handled on the server
  const filtered = products;

  const openNew = () => {
    setEditing(null);
    setPrefillBarcode("");
    setOpen(true);
  };

  useEffect(() => {
    const handleFocusSearch = () => {
      document.getElementById("products-search-input")?.focus();
    };
    const handleAddProduct = () => {
      openNew();
    };
    const handleFilterLowStock = () => {
      setLowStockOnly((prev) => {
        const next = !prev;
        toast.info(next ? "Filtering by low stock" : "Showing all products");
        return next;
      });
    };

    window.addEventListener("cmd:focus-product-search", handleFocusSearch);
    window.addEventListener("cmd:add-product", handleAddProduct);
    window.addEventListener("cmd:filter-low-stock", handleFilterLowStock);

    return () => {
      window.removeEventListener("cmd:focus-product-search", handleFocusSearch);
      window.removeEventListener("cmd:add-product", handleAddProduct);
      window.removeEventListener("cmd:filter-low-stock", handleFilterLowStock);
    };
  }, []);

  const openEdit = (p: Product) => {
    setEditing(p);
    setPrefillBarcode("");
    setOpen(true);
  };

  const openScanForNew = () => { setScanTarget("new"); setScanOpen(true); };
  const openScanForForm = () => { setScanTarget("form"); setScanOpen(true); };

  const handleScanned = (code: string) => {
    setScanOpen(false);
    if (!code) return;
    if (scanTarget === "form") {
      toast.success(`Barcode captured: ${code}`);
      setPrefillBarcode(code);
      return;
    }
    const existing = products.find((p) => p.barcode === code || p.sku === code);
    if (existing) {
      toast.info(`"${existing.name}" already exists — opened for editing`);
      openEdit(existing);
    } else {
      setEditing(null);
      setPrefillBarcode(code);
      setOpen(true);
      toast.success(`New barcode ${code} — fill in product details`);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  const filteredIds = filtered.map((p) => p.id);
  const allOnPageSelected = filteredIds.length > 0 && filteredIds.every((id) => selected.has(id));
  const someSelected = filteredIds.some((id) => selected.has(id));

  const toggleAll = (checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) filteredIds.forEach((id) => next.add(id));
      else filteredIds.forEach((id) => next.delete(id));
      return next;
    });
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id); else next.delete(id);
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());
  const openBulk = () => { setBulk(initialBulkState); setBulkOpen(true); };

  const applyRelative = (
    base: number,
    mode: "none" | "set" | "increase" | "decrease",
    value: number,
    unit: "amount" | "percent"
  ) => {
    if (mode === "none") return undefined;
    if (mode === "set") return Math.max(0, value);
    if (mode === "increase") {
      return unit === "percent" ? Math.round(base * (1 + value / 100)) : Math.max(0, base + value);
    }
    return unit === "percent" ? Math.max(0, Math.round(base * (1 - value / 100))) : Math.max(0, base - value);
  };

  const applyBulk = () => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    const flatPatch: Partial<Product> = {};
    if (bulk.statusMode === "active") flatPatch.active = true;
    if (bulk.statusMode === "inactive") flatPatch.active = false;
    if (bulk.categoryMode === "set" && bulk.categoryValue) flatPatch.category = bulk.categoryValue as Category;
    if (bulk.minStockMode === "set") flatPatch.minStock = Math.max(0, Number(bulk.minStockValue) || 0);
    
    const needsPerItem =
      bulk.priceMode !== "none" || bulk.costMode !== "none" ||
      bulk.wholesaleMode !== "none" || bulk.stockMode !== "none";

    if (!needsPerItem && Object.keys(flatPatch).length === 0) {
      toast.error("Choose at least one field to update");
      return;
    }

    if (needsPerItem) {
      const idSet = new Set(ids);
      const priceVal = Number(bulk.priceValue) || 0;
      const costVal = Number(bulk.costValue) || 0;
      const wholesaleVal = Number(bulk.wholesaleValue) || 0;
      const stockVal = Number(bulk.stockValue) || 0;

      products.forEach((p) => {
        if (!idSet.has(p.id)) return;
        const patch: Partial<Product> = { ...flatPatch };

        const newPrice = applyRelative(p.price, bulk.priceMode, priceVal, bulk.priceUnit);
        if (newPrice !== undefined) patch.price = newPrice;

        const newCost = applyRelative(p.costPrice, bulk.costMode, costVal, bulk.costUnit);
        if (newCost !== undefined) patch.costPrice = newCost;

        const newWholesale = applyRelative(p.wholesalePrice, bulk.wholesaleMode, wholesaleVal, bulk.wholesaleUnit);
        if (newWholesale !== undefined) patch.wholesalePrice = newWholesale;

        if (bulk.stockMode === "set") patch.stock = Math.max(0, stockVal);
        else if (bulk.stockMode === "add") patch.stock = p.stock + stockVal;
        else if (bulk.stockMode === "subtract") patch.stock = Math.max(0, p.stock - stockVal);

        updateMutation.mutate({ id: p.id, patch });
      });
    } else {
      bulkUpdateMutation.mutate({ ids, patch: flatPatch });
    }

    toast.success(`Updated ${ids.length} product${ids.length > 1 ? "s" : ""}`);
    setBulkOpen(false);
    clearSelection();
  };

  const confirmBulkDelete = () => {
    const ids = Array.from(selected);
    bulkDeleteMutation.mutate(ids);
    toast.success(`Deleted ${ids.length} product${ids.length > 1 ? "s" : ""}`);
    setBulkDeleteOpen(false);
    clearSelection();
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Products"
        description="Manage your product catalog, pricing and stock levels."
        actions={
          <>
            <Button size="sm" onClick={openScanForNew} variant="outline" title="Scan barcode to add product">
              <ScanLine className="h-3.5 w-3.5 mr-1.5" />Scan
            </Button>
            <Button size="sm" onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="h-3.5 w-3.5 mr-1.5" />Add Product
            </Button>
          </>
        }
      />

      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="products-search-input"
              placeholder="Search by name or SKU…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="sm:w-52"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All categories</SelectItem>
              {storeCategories.map((c) => {
                const parent = c.parentId ? storeCategories.find(p => p.id === c.parentId) : null;
                const displayName = parent ? `${parent.name} > ${c.name}` : c.name;
                return (
                  <SelectItem key={c.id} value={c.id}>{displayName}</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {lowStockOnly && (
        <Card className="p-3 flex items-center justify-between border-amber-300 bg-amber-50 text-amber-800">
          <span className="text-xs font-semibold">⚠️ Filtering by low stock alert level</span>
          <Button size="sm" variant="ghost" className="h-6 text-xs text-amber-800 hover:bg-amber-100" onClick={() => setLowStockOnly(false)}>
            Clear Filter
          </Button>
        </Card>
      )}

      {selected.size > 0 && (
        <Card className="p-3 flex flex-wrap items-center gap-3 border-primary/40 bg-primary/5">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex items-center gap-2 ml-auto">
            <Button size="sm" variant="outline" onClick={openBulk}>
              <Settings2 className="h-4 w-4 mr-2" />Bulk edit
            </Button>
            <Button size="sm" variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/10" onClick={() => setBulkDeleteOpen(true)}>
              <Trash2 className="h-4 w-4 mr-2" />Delete
            </Button>
            <Button size="sm" variant="ghost" onClick={clearSelection}>
              <X className="h-4 w-4 mr-2" />Clear
            </Button>
          </div>
        </Card>
      )}

      <Card>
        {products.length === 0 ? (
          <EmptyState
            icon={PackageOpen}
            title={(queryFilter.search || queryFilter.categoryId || queryFilter.lowStock) ? "No products match your filters" : "No products yet"}
            description={(queryFilter.search || queryFilter.categoryId || queryFilter.lowStock)
              ? "Try adjusting your search or filters to find what you're looking for."
              : "Add your first product to start selling."}
            action={!(queryFilter.search || queryFilter.categoryId || queryFilter.lowStock) ? (
              <Button onClick={openNew} className="bg-primary text-primary-foreground hover:bg-primary/90 mt-4">
                <Plus className="h-4 w-4 mr-2" />Add Product
              </Button>
            ) : undefined}
          />
        ) : (
          <>
            {/* Mobile: card list */}
            <div className="sm:hidden divide-y">
              {filtered.map((p) => {
                const out = p.stock <= 0;
                const low = !out && p.stock <= p.minStock;
                return (
                  <div
                    key={p.id}
                    className="flex items-start gap-3 p-4 active:bg-secondary/40 transition-colors"
                  >
                    <div className="shrink-0">
                      {p.imageUrl ? (
                        <Image src={p.imageUrl} alt={productDisplayName(p)} width={48} height={48} className="h-12 w-12 object-cover rounded-lg" />
                      ) : (
                        <span className="text-3xl">{p.emoji}</span>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{productDisplayName(p)}</p>
                        <Badge variant="secondary" className="text-[10px]">{categoryName(p)}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{p.sku}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="text-sm font-medium">{p.minStock} {p.unit}</span>
                        </div>
                        <div className="flex items-center gap-1 ml-auto">
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(p)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(p.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                          <Checkbox
                            checked={selected.has(p.id)}
                            onCheckedChange={(c) => toggleOne(p.id, !!c)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Desktop / tablet: table */}
            <div className="hidden sm:block overflow-x-auto">
              <Table variant="premium">
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={allOnPageSelected ? true : someSelected ? "indeterminate" : false}
                        onCheckedChange={(c) => toggleAll(!!c)}
                        aria-label="Select all"
                      />
                    </TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="hidden sm:table-cell">Sub-category</TableHead>
                    <TableHead className="text-right">M. Stock</TableHead>
                    <TableHead className="text-right w-[1%] whitespace-nowrap" title="Actions">
                      <Settings2 className="h-4 w-4 ml-auto text-white" />
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((p) => {
                    const out = p.stock <= 0;
                    const low = !out && p.stock <= p.minStock;
                    const isSelected = selected.has(p.id);
                    return (
                      <TableRow key={p.id} data-state={isSelected ? "selected" : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={(c) => toggleOne(p.id, !!c)}
                            aria-label={`Select ${productDisplayName(p)}`}
                          />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            {p.imageUrl ? (
                              <Image src={p.imageUrl} alt={productDisplayName(p)} width={40} height={40} className="h-10 w-10 object-cover rounded-md" />
                            ) : (
                              <div className="h-10 w-10 flex items-center justify-center bg-muted rounded-md text-2xl">{p.emoji}</div>
                            )}
                            <span className="font-medium">{productDisplayName(p)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">{p.sku}</TableCell>
                        <TableCell><Badge variant="secondary">{categoryName(p)}</Badge></TableCell>
                        <TableCell className="hidden sm:table-cell text-muted-foreground text-sm">{p.subcategory || "—"}</TableCell>
                        <TableCell className="text-right">
                          <span className="font-medium">{p.minStock} {p.unit === "pcs" ? "p" : p.unit}</span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">Open menu</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(p)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteId(p.id)}>
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
            
            {hasNextPage && (
              <div className="flex justify-center mt-6 mb-2">
                <Button 
                  variant="outline" 
                  onClick={() => fetchNextPage()} 
                  disabled={isFetchingNextPage}
                  className="bg-white"
                >
                  {isFetchingNextPage ? "Loading more..." : "Load More Products"}
                </Button>
              </div>
            )}
          </>
        )}
      </Card>

      <ProductFormDialog
        open={open}
        onOpenChange={setOpen}
        editing={editing}
        prefillBarcode={prefillBarcode}
        onScanRequest={openScanForForm}
      />

      <ConfirmDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
        title="Delete this product?"
        description="This action cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={confirmBulkDelete}
      />

      {/* Bulk Edit Dialog */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk edit {selected.size} product{selected.size > 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              Leave a section as "No change" to keep existing values.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-semibold">Stock</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select value={bulk.stockMode} onValueChange={(v) => setBulk({ ...bulk, stockMode: v as BulkState["stockMode"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No change</SelectItem>
                    <SelectItem value="set">Set to</SelectItem>
                    <SelectItem value="add">Add</SelectItem>
                    <SelectItem value="subtract">Subtract</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number" placeholder="Quantity"
                  value={bulk.stockValue}
                  onChange={(e) => setBulk({ ...bulk, stockValue: e.target.value })}
                  disabled={bulk.stockMode === "none"}
                />
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-semibold">Min Stock Alert Level</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select value={bulk.minStockMode} onValueChange={(v) => setBulk({ ...bulk, minStockMode: v as BulkState["minStockMode"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No change</SelectItem>
                    <SelectItem value="set">Set to</SelectItem>
                  </SelectContent>
                </Select>
                <Input
                  type="number" placeholder="Quantity"
                  value={bulk.minStockValue}
                  onChange={(e) => setBulk({ ...bulk, minStockValue: e.target.value })}
                  disabled={bulk.minStockMode === "none"}
                />
              </div>
            </div>

            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-semibold">Category</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <Select value={bulk.categoryMode} onValueChange={(v) => setBulk({ ...bulk, categoryMode: v as BulkState["categoryMode"] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No change</SelectItem>
                    <SelectItem value="set">Set to</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={bulk.categoryValue}
                  onValueChange={(v) => setBulk({ ...bulk, categoryValue: v as Category })}
                  disabled={bulk.categoryMode === "none"}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {storeCategories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBulkOpen(false)}>Cancel</Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={applyBulk}>
              Apply to {selected.size} item{selected.size > 1 ? "s" : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={bulkDeleteOpen}
        onOpenChange={setBulkDeleteOpen}
        title={`Delete ${selected.size} product${selected.size > 1 ? "s" : ""}?`}
        description="This action cannot be undone."
        confirmLabel="Delete all"
        destructive
        onConfirm={confirmBulkDelete}
      />

      <CameraScanner
        open={scanOpen}
        onClose={() => setScanOpen(false)}
        onDetected={handleScanned}
      />
    </div>
  );
}

type RelMode = "none" | "set" | "increase" | "decrease";
type RelUnit = "amount" | "percent";

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
