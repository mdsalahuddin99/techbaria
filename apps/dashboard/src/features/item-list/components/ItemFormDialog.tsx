import { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Plus } from "lucide-react";
import { CategoryFormDialog, type CategoryDialogMode } from "@/features/categories/components/CategoryFormDialog";
import { toast } from "sonner";

export function ItemFormDialog({ open, onOpenChange, editing, categories }: any) {
  const queryClient = useQueryClient();

  const [categoryName, setCategoryName] = useState("");
  const [subcategoryName, setSubcategoryName] = useState("");
  const [brandName, setBrandName] = useState("");
  const [productTypeName, setProductTypeName] = useState("");
  const [modelName, setModelName] = useState("");
  const [seriesName, setSeriesName] = useState("");
  const [colors, setColors] = useState("");
  const [storages, setStorages] = useState("");
  const [rams, setRams] = useState("");

  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catDialogMode, setCatDialogMode] = useState<CategoryDialogMode>("main");

  const { data: itemLists = [] } = useQuery({
    queryKey: ["item-lists"],
    queryFn: async () => {
      const res = await fetch("/api/item-list");
      if (!res.ok) return [];
      return res.json();
    },
    enabled: open, // only fetch when dialog is open
  });

  useEffect(() => {
    if (open) {
      if (editing) {
        setCategoryName(editing.categoryId || "");
        setSubcategoryName(editing.subcategory || "");
        setBrandName(editing.brand?.name || "");
        setProductTypeName(editing.productType?.name || "");
        setModelName(editing.model?.name || "");
        setSeriesName(editing.series?.name || "");
        setColors(editing.colors?.join(", ") || "");
        setStorages(editing.storages?.join(", ") || "");
        setRams(editing.rams?.join(", ") || "");
      } else {
        setCategoryName("");
        setSubcategoryName("");
        setBrandName("");
        setProductTypeName("");
        setModelName("");
        setSeriesName("");
        setColors("");
        setStorages("");
        setRams("");
      }
    }
  }, [open, editing]);

  const { data: freshCategories = categories } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const res = await fetch("/api/categories?flat=true");
      if (!res.ok) return categories;
      return res.json();
    },
    initialData: categories,
    enabled: open,
  });

  const selectedCategoryObj = freshCategories.find((c: any) => c.name === categoryName);
  const subcategories = freshCategories.filter((c: any) => c.parentId === selectedCategoryObj?.id);

  // Compute available suggestions based on parents
  const availableBrands = Array.from(new Set(itemLists
    .filter((list: any) => list.categoryId === categoryName && (subcategoryName ? list.subcategory === subcategoryName : true))
    .map((list: any) => list.brand?.name)
    .filter(Boolean)
  ));

  const availableProductNames = Array.from(new Set(itemLists
    .filter((list: any) => list.brand?.name === brandName)
    .map((list: any) => list.productType?.name)
    .filter(Boolean)
  ));

  const availableModels = Array.from(new Set(itemLists
    .filter((list: any) => list.productType?.name === productTypeName)
    .map((list: any) => list.model?.name)
    .filter(Boolean)
  ));

  const availableSeries = Array.from(new Set(itemLists
    .filter((list: any) => list.model?.name === modelName)
    .map((list: any) => list.series?.name)
    .filter(Boolean)
  ));

  const mut = useMutation({
    mutationFn: async (data: any) => {
      const isUpdate = !!editing?.id;
      const url = "/api/item-list";
      const method = isUpdate ? "PUT" : "POST";
      const body = isUpdate ? { ...data, id: editing.id } : data;

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Failed to save item list");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["item-lists"] });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      onOpenChange(false);
      toast.success(editing?.id ? "Item updated successfully" : "Item created successfully");
    },
    onError: (err: any) => {
      toast.error(err.message || "Failed to save");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName) return toast.error("Category is required");
    if (!subcategoryName) return toast.error("Subcategory is required");
    if (!brandName) return toast.error("Brand is required");
    if (!productTypeName) return toast.error("Product Name is required");
    if (!modelName) return toast.error("Model is required");
    if (!seriesName) return toast.error("Series is required");

    const data = {
      categoryId: categoryName, // backend stores this string, we use the name
      subcategory: subcategoryName || null,
      brandName: brandName || null,
      productTypeName: productTypeName || null,
      modelName: modelName || null,
      seriesName: seriesName || null,
      colors: colors.split(",").map((s) => s.trim()).filter(Boolean),
      storages: storages.split(",").map((s) => s.trim()).filter(Boolean),
      rams: rams.split(",").map((s) => s.trim()).filter(Boolean),
    };

    mut.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b">
          <DialogTitle>{editing?.id ? "Edit Item List" : editing ? "Duplicate Item List" : "Create Item List"}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <form id="item-form" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-row items-center gap-3">
                <label className="w-[120px] shrink-0 text-right text-sm font-medium">Category *</label>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <Select value={categoryName} onValueChange={(val) => { setCategoryName(val); setSubcategoryName(""); }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {freshCategories.filter((c: any) => !c.parentId).map((c: any) => (
                          <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0"
                    onClick={() => { setCatDialogMode("main"); setCatDialogOpen(true); }}
                    title="Add new category"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex flex-row items-center gap-3">
                <label className="w-[120px] shrink-0 text-right text-sm font-medium">Subcategory *</label>
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <Select value={subcategoryName} onValueChange={setSubcategoryName} disabled={!categoryName || subcategories.length === 0}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select Subcategory" />
                      </SelectTrigger>
                      <SelectContent>
                        {subcategories.map((s: any) => (
                          <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button" size="icon" variant="outline" className="h-9 w-9 shrink-0"
                    disabled={!categoryName}
                    onClick={() => { setCatDialogMode("sub"); setCatDialogOpen(true); }}
                    title="Add new subcategory"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-row items-center gap-3">
                <label className="w-[120px] shrink-0 text-right text-sm font-medium">Brand *</label>
                <div className="flex-1 min-w-0">
                  <Input list="brands-list" value={brandName} onChange={(e) => setBrandName(e.target.value)} placeholder="e.g. Samsung" autoComplete="off" disabled={!subcategoryName} />
                </div>
                <datalist id="brands-list">
                  {availableBrands.map((name: any) => <option key={name} value={name} />)}
                </datalist>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[120px] shrink-0 text-right text-sm font-medium">Product Name *</label>
                <div className="flex-1 min-w-0">
                  <Input list="products-list" value={productTypeName} onChange={(e) => setProductTypeName(e.target.value)} placeholder="e.g. Smartphone" autoComplete="off" disabled={!brandName} />
                </div>
                <datalist id="products-list">
                  {availableProductNames.map((name: any) => <option key={name} value={name} />)}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-row items-center gap-3">
                <label className="w-[120px] shrink-0 text-right text-sm font-medium">Model *</label>
                <div className="flex-1 min-w-0">
                  <Input list="models-list" value={modelName} onChange={(e) => setModelName(e.target.value)} placeholder="e.g. Galaxy S24" autoComplete="off" disabled={!productTypeName} />
                </div>
                <datalist id="models-list">
                  {availableModels.map((name: any) => <option key={name} value={name} />)}
                </datalist>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[120px] shrink-0 text-right text-sm font-medium">Series *</label>
                <div className="flex-1 min-w-0">
                  <Input list="series-list" value={seriesName} onChange={(e) => setSeriesName(e.target.value)} placeholder="e.g. Ultra" autoComplete="off" disabled={!modelName} />
                </div>
                <datalist id="series-list">
                  {availableSeries.map((name: any) => <option key={name} value={name} />)}
                </datalist>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-row items-center gap-3">
                <label className="w-[120px] shrink-0 text-right text-sm font-medium">Colors</label>
                <div className="flex-1 min-w-0">
                  <Input value={colors} onChange={(e) => setColors(e.target.value)} placeholder="e.g. Titanium Black" />
                </div>
              </div>
              <div className="flex flex-row items-center gap-3">
                <label className="w-[120px] shrink-0 text-right text-sm font-medium">Storage</label>
                <div className="flex-1 min-w-0">
                  <Input value={storages} onChange={(e) => setStorages(e.target.value)} placeholder="e.g. 256GB, 512GB" />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-row items-center gap-3">
                <label className="w-[120px] shrink-0 text-right text-sm font-medium">RAM</label>
                <div className="flex-1 min-w-0">
                  <Input value={rams} onChange={(e) => setRams(e.target.value)} placeholder="e.g. 12GB, 16GB" />
                </div>
              </div>
            </div>

          </form>
        </div>

        <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" form="item-form" disabled={mut.isPending}>
            {mut.isPending ? "Saving..." : "Save Item"}
          </Button>
        </div>
      </DialogContent>

      <CategoryFormDialog
        open={catDialogOpen}
        onOpenChange={(o) => {
          setCatDialogOpen(o);
          if (!o) queryClient.invalidateQueries({ queryKey: ["categories"] });
        }}
        mode={catDialogMode}
        parentName={catDialogMode === "sub" ? categoryName : undefined}
        onCreated={(name) => {
          if (catDialogMode === "sub") {
            setSubcategoryName(name);
          } else {
            setCategoryName(name);
          }
        }}
      />
    </Dialog>
  );
}
