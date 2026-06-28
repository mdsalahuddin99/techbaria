import { useState, useRef, useEffect } from "react";
import { UseFormReturn, useWatch } from "react-hook-form";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { Product } from "@/shared/lib/types";
import { ProductFormValues } from "../../schemas";
import { listCategories } from "@/shared/api-client/categories";
import { apiFetch } from "@/shared/api-client/fetch";
import { productDisplayName } from "@/shared/lib/format";
import {
  FormField, FormItem, FormLabel, FormControl, FormMessage,
} from "@/shared/ui/form";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Button } from "@/shared/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/shared/ui/dialog";
import { Label } from "@/shared/ui/label";
import { Input } from "@/shared/ui/input";
import { LoadingButton } from "@/shared/ui/loading-button";
import { CategoryFormDialog, type CategoryDialogMode } from "@/features/categories/components/CategoryFormDialog";

interface Props {
  form: UseFormReturn<ProductFormValues>;
  editing: Product | null;
}

export function ProductFormCascadingFields({ form, editing }: Props) {
  const { control } = form;
  const category = useWatch({ name: "category", control });
  const subcategory = useWatch({ name: "subcategory", control });

  // ── Categories for cascading selects ──
  const { data: allCategories = [] } = useQuery({
    queryKey: ["categories", "flat"],
    queryFn: () => listCategories(true) as Promise<any[]>,
  });
  const queryClient = useQueryClient();

  const parentCategories = allCategories.filter((c: any) => !c.parentId);
  const subcategories = allCategories.filter((c: any) => {
    const parent = parentCategories.find((p: any) => p.name === category);
    return parent && c.parentId === parent.id;
  });

  // Find subcategory ID from name for catalog API queries
  const subcategoryItem = allCategories.find((c: any) => c.name === subcategory);
  const subcategoryId = subcategoryItem?.id || "";

  // ── Cascading select state (IDs for API queries) ──
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [selectedModelId, setSelectedModelId] = useState("");
  type QuickCreateEntity = "brands" | "products" | "models" | "series";
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateEntity, setQuickCreateEntity] = useState<QuickCreateEntity>("brands");
  const [quickCreateName, setQuickCreateName] = useState("");
  const [quickCreateSaving, setQuickCreateSaving] = useState(false);

  // Fetch brands for selected subcategory
  const { data: brands = [] } = useQuery({
    queryKey: ["catalog", "brands", subcategoryId],
    queryFn: () => apiFetch<any[]>(`/api/catalog?entity=brands&parentId=${subcategoryId}`),
    enabled: !!subcategoryId,
  });

  // Fetch products for selected brand
  const { data: products = [] } = useQuery({
    queryKey: ["catalog", "products", selectedBrandId],
    queryFn: () => apiFetch<any[]>(`/api/catalog?entity=products&parentId=${selectedBrandId}`),
    enabled: !!selectedBrandId,
  });

  // Fetch models for selected product
  const { data: models = [] } = useQuery({
    queryKey: ["catalog", "models", selectedProductId],
    queryFn: () => apiFetch<any[]>(`/api/catalog?entity=models&parentId=${selectedProductId}`),
    enabled: !!selectedProductId,
  });

  // Fetch series for selected model
  const { data: seriesList = [] } = useQuery({
    queryKey: ["catalog", "series", selectedModelId],
    queryFn: () => apiFetch<any[]>(`/api/catalog?entity=series&parentId=${selectedModelId}`),
    enabled: !!selectedModelId,
  });

  // Initialize selected IDs when editing (load from saved FK IDs)
  const initRef = useRef(false);
  useEffect(() => {
    if (!editing || initRef.current) return;
    initRef.current = true;
    const bId = editing.brandId;
    const mId = editing.modelId;
    const catalogProdId = editing.catalogProductId;
    if (bId) {
      setSelectedBrandId(bId);
      if (catalogProdId) {
        setSelectedProductId(catalogProdId);
      }
      if (mId) {
        setSelectedModelId(mId);
      }
    }
  }, [editing]);

  // When products list loads, if selectedProductId is not set, try to match by product name
  useEffect(() => {
    if (editing && !selectedProductId && products.length > 0) {
      const match = products.find((p) => p.name === editing.name);
      if (match) {
        setSelectedProductId(match.id);
      }
    }
  }, [editing, products, selectedProductId]);

  // Category creation dialog state
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catDialogMode, setCatDialogMode] = useState<CategoryDialogMode>("main");

  const openQuickCreate = (entity: QuickCreateEntity) => {
    setQuickCreateEntity(entity);
    setQuickCreateName("");
    setQuickCreateOpen(true);
  };

  const quickCreateParent = (() => {
    if (quickCreateEntity === "brands") {
      return {
        id: subcategoryId,
        label: subcategory ?? "",
        fieldLabel: "Sub-category",
        title: "Add Brand",
      };
    }
    if (quickCreateEntity === "products") {
      const b = brands.find((x: any) => x.id === selectedBrandId);
      return {
        id: selectedBrandId,
        label: b?.name ?? (form.getValues("brand") ?? ""),
        fieldLabel: "Brand",
        title: "Add Product Name",
      };
    }
    if (quickCreateEntity === "models") {
      const p = products.find((x: any) => x.id === selectedProductId);
      return {
        id: selectedProductId,
        label: p?.name ?? (form.getValues("name") ?? ""),
        fieldLabel: "Product Name",
        title: "Add Model",
      };
    }
    const m = models.find((x: any) => x.id === selectedModelId);
    return {
      id: selectedModelId,
      label: m?.name ?? (form.getValues("model") ?? ""),
      fieldLabel: "Model",
      title: "Add Series",
    };
  })();

  const handleQuickCreate = async () => {
    const name = quickCreateName.trim();
    const parentId = quickCreateParent.id;
    if (!name) {
      toast.error("Name is required");
      return;
    }
    if (!parentId) {
      toast.error(`Select ${quickCreateParent.fieldLabel} first`);
      return;
    }
    setQuickCreateSaving(true);
    try {
      const payload: any = { entity: quickCreateEntity, name };
      if (quickCreateEntity === "brands") payload.categoryId = parentId;
      if (quickCreateEntity === "products") payload.brandId = parentId;
      if (quickCreateEntity === "models") payload.productId = parentId;
      if (quickCreateEntity === "series") payload.modelId = parentId;
      const created = await apiFetch<any>("/api/catalog", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      queryClient.invalidateQueries({ queryKey: ["catalog"] });
      if (quickCreateEntity === "brands") {
        form.setValue("brand", created.id, { shouldDirty: true });
        setSelectedBrandId(created.id);
        setSelectedProductId("");
        setSelectedModelId("");
        form.setValue("name", "");
        form.setValue("model", "");
        form.setValue("series", "");
      } else if (quickCreateEntity === "products") {
        form.setValue("name", created.name, { shouldDirty: true });
        setSelectedProductId(created.id);
        setSelectedModelId("");
        form.setValue("model", "");
        form.setValue("series", "");
      } else if (quickCreateEntity === "models") {
        form.setValue("model", created.id, { shouldDirty: true });
        setSelectedModelId(created.id);
        form.setValue("series", "");
      } else {
        form.setValue("series", created.id, { shouldDirty: true });
      }
      setQuickCreateOpen(false);
      setQuickCreateName("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create");
    } finally {
      setQuickCreateSaving(false);
    }
  };

  return (
    <>
      {/* 1. Category */}
      <FormField control={control} name="category" render={({ field }) => (
        <FormItem>
          <FormLabel>Category</FormLabel>
          <div className="flex gap-1 items-start">
            <div className="flex-1 min-w-0">
              <Select value={field.value} onValueChange={(v) => {
                field.onChange(v);
                form.setValue("subcategory", "");
                form.setValue("brand", "");
                form.setValue("name", "");
                form.setValue("model", "");
                form.setValue("series", "");
                setSelectedBrandId("");
                setSelectedProductId("");
                setSelectedModelId("");
              }}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {parentCategories.map((c: any) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0"
              onClick={() => { setCatDialogMode("main"); setCatDialogOpen(true); }}
              title="Add new category"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )} />

      {/* 2. Sub-category */}
      <FormField control={control} name="subcategory" render={({ field }) => (
        <FormItem>
          <FormLabel>Sub-category <span className="text-destructive">*</span></FormLabel>
          <div className="flex gap-1 items-start">
            <div className="flex-1 min-w-0">
              <Select
                value={field.value}
                onValueChange={(v) => {
                  field.onChange(v);
                  form.setValue("brand", "");
                  form.setValue("name", "");
                  form.setValue("model", "");
                  form.setValue("series", "");
                  setSelectedBrandId("");
                  setSelectedProductId("");
                  setSelectedModelId("");
                }}
                disabled={!category || subcategories.length === 0}
              >
                <SelectTrigger><SelectValue placeholder={!category ? "Select category first" : "Select sub-category"} /></SelectTrigger>
                <SelectContent>
                  {subcategories.map((c: any) => (
                    <SelectItem key={c.id} value={c.name}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0"
              disabled={!category}
              onClick={() => { setCatDialogMode("sub"); setCatDialogOpen(true); }}
              title="Add new sub-category"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <CategoryFormDialog
            open={catDialogOpen}
            onOpenChange={(o) => {
              setCatDialogOpen(o);
              if (!o) queryClient.invalidateQueries({ queryKey: ["categories"] });
            }}
            mode={catDialogMode}
            parentName={catDialogMode === "sub" ? category : undefined}
            onCreated={(name) => {
              if (catDialogMode === "sub") {
                form.setValue("subcategory", name, { shouldDirty: !editing });
              } else {
                form.setValue("category", name, { shouldDirty: !editing });
              }
            }}
          />
          <FormMessage />
        </FormItem>
      )} />

      {/* 3. Brand */}
      <FormField control={control} name="brand" render={({ field }) => (
        <FormItem>
          <FormLabel>Brand</FormLabel>
          <div className="flex gap-1 items-start">
            <div className="flex-1 min-w-0">
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => {
                  field.onChange(v);
                  setSelectedBrandId(v);
                  setSelectedProductId("");
                  setSelectedModelId("");
                  form.setValue("name", "");
                  form.setValue("model", "");
                  form.setValue("series", "");
                }}
                disabled={!subcategoryId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!subcategoryId ? "Select subcategory first" : brands.length === 0 ? "No brands available" : "Select brand"}>
                    {brands.find((b: any) => b.id === field.value)?.name || (editing?.brandId === field.value ? editing?.brand : field.value) || ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {brands.map((b: any) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0"
              disabled={!subcategoryId}
              onClick={() => openQuickCreate("brands")}
              title="Add new brand"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )} />

      {/* 4. Product Name */}
      <FormField control={control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Product Name <span className="text-destructive">*</span></FormLabel>
          <div className="flex gap-1 items-start">
            <div className="flex-1 min-w-0">
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => {
                  field.onChange(v);
                  const product = products.find((p: any) => p.name === v);
                  setSelectedProductId(product?.id || "");
                  setSelectedModelId("");
                  form.setValue("model", "");
                  form.setValue("series", "");
                }}
                disabled={!selectedBrandId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedBrandId ? "Select brand first" : products.length === 0 ? "No products available" : "Select product name"}>
                    {products.find((p: any) => p.name === field.value || p.id === field.value)?.name ?? field.value ?? ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {products.map((p: any) => (
                    <SelectItem key={p.id} value={p.name}>{productDisplayName(p)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0"
              disabled={!selectedBrandId}
              onClick={() => openQuickCreate("products")}
              title="Add new product name"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )} />

      {/* 5. Model */}
      <FormField control={control} name="model" render={({ field }) => (
        <FormItem>
          <FormLabel>Model</FormLabel>
          <div className="flex gap-1 items-start">
            <div className="flex-1 min-w-0">
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => {
                  field.onChange(v);
                  setSelectedModelId(v);
                  form.setValue("series", "");
                }}
                disabled={!selectedProductId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedProductId ? "Select product first" : models.length === 0 ? "No models available" : "Select model"}>
                    {models.find((m: any) => m.id === field.value)?.name || (editing?.modelId === field.value ? editing?.model : field.value) || ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {models.map((m: any) => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0"
              disabled={!selectedProductId}
              onClick={() => openQuickCreate("models")}
              title="Add new model"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )} />

      {/* 6. Series */}
      <FormField control={control} name="series" render={({ field }) => (
        <FormItem>
          <FormLabel>Series</FormLabel>
          <div className="flex gap-1 items-start">
            <div className="flex-1 min-w-0">
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => {
                  field.onChange(v);
                }}
                disabled={!selectedModelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedModelId ? "Select model first" : seriesList.length === 0 ? "No series available" : "Select series"}>
                    {seriesList.find((s: any) => s.id === field.value)?.name || (editing?.seriesId === field.value ? editing?.series : field.value) || ""}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {seriesList.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0"
              disabled={!selectedModelId}
              onClick={() => openQuickCreate("series")}
              title="Add new series"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )} />

      <Dialog
        open={quickCreateOpen}
        onOpenChange={(o) => {
          setQuickCreateOpen(o);
          if (!o) setQuickCreateName("");
        }}
      >
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{quickCreateParent.title}</DialogTitle>
            <DialogDescription>
              Create a new item under the selected {quickCreateParent.fieldLabel.toLowerCase()}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{quickCreateParent.fieldLabel}</Label>
              <Input value={quickCreateParent.label || ""} disabled />
            </div>
            <div className="space-y-1.5">
              <Label>Name <span className="text-destructive">*</span></Label>
              <Input
                value={quickCreateName}
                onChange={(e) => setQuickCreateName(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setQuickCreateOpen(false)} disabled={quickCreateSaving}>
              Cancel
            </Button>
            <LoadingButton
              type="button"
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleQuickCreate}
              loading={quickCreateSaving}
              disabled={!quickCreateParent.id || !quickCreateName.trim()}
            >
              Save
            </LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
