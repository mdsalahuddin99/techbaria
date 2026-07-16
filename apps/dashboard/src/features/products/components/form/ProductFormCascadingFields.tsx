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
import { AsyncSuggest } from "@/shared/ui/async-suggest";
import { CategoryFormDialog, type CategoryDialogMode } from "@/features/categories/components/CategoryFormDialog";

interface Props {
  form: UseFormReturn<ProductFormValues>;
  editing: Product | null;
}

export function ProductFormCascadingFields({ form, editing }: Props) {
  const { control } = form;
  const category = useWatch({ name: "category", control });
  const subcategory = useWatch({ name: "subcategory", control });
  const brand = useWatch({ name: "brand", control }); // Brand ID
  const productName = useWatch({ name: "name", control }); // Product Name (string)
  const model = useWatch({ name: "model", control }); // Model ID

  // ── Categories (still hierarchical) ──
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

  type QuickCreateEntity = "brands" | "products" | "models" | "series";
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickCreateEntity, setQuickCreateEntity] = useState<QuickCreateEntity>("brands");
  const [quickCreateName, setQuickCreateName] = useState("");
  const [quickCreateSaving, setQuickCreateSaving] = useState(false);

  // Fetch filtered lists based on parent in cascade
  const { data: brands = [] } = useQuery({
    queryKey: ["catalog", "brands", subcategory ?? ""],
    queryFn: () => subcategory
      ? apiFetch<any[]>(`/api/catalog?entity=brands&subcategory=${encodeURIComponent(subcategory)}`)
      : apiFetch<any[]>(`/api/catalog?entity=brands`),
  });

  // Products (Product Name) depend on selected brand
  const { data: products = [] } = useQuery({
    queryKey: ["catalog", "products", brand ?? ""],
    queryFn: () => brand
      ? apiFetch<any[]>(`/api/catalog?entity=products&brandId=${brand}`)
      : apiFetch<any[]>(`/api/catalog?entity=products`),
  });

  // Find selected product type ID from the name field
  const selectedProductType = products.find((p: any) => p.name === productName || p.id === productName);
  const selectedProductTypeId = selectedProductType?.id;

  // Models depend on selected product type (Product Name)
  const { data: models = [] } = useQuery({
    queryKey: ["catalog", "models", selectedProductTypeId ?? ""],
    queryFn: () => selectedProductTypeId
      ? apiFetch<any[]>(`/api/catalog?entity=models&productTypeId=${selectedProductTypeId}`)
      : apiFetch<any[]>(`/api/catalog?entity=models`),
  });

  // Series depend on selected model
  const { data: seriesList = [] } = useQuery({
    queryKey: ["catalog", "series", model ?? ""],
    queryFn: () => model
      ? apiFetch<any[]>(`/api/catalog?entity=series&modelId=${model}`)
      : apiFetch<any[]>(`/api/catalog?entity=series`),
  });

  // Track previous fields to detect change and reset downstream fields
  const prevSubcategoryRef = useRef<string | undefined>(undefined);
  const prevBrandRef = useRef<string | undefined>(undefined);
  const prevProductNameRef = useRef<string | undefined>(undefined);
  const prevModelRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (prevSubcategoryRef.current !== undefined && prevSubcategoryRef.current !== subcategory) {
      form.setValue("brand", "", { shouldDirty: true });
      form.setValue("name", "", { shouldDirty: true });
      form.setValue("model", "", { shouldDirty: true });
      form.setValue("series", "", { shouldDirty: true });
    }
    prevSubcategoryRef.current = subcategory;
  }, [subcategory, form]);

  useEffect(() => {
    if (prevBrandRef.current !== undefined && prevBrandRef.current !== brand) {
      form.setValue("name", "", { shouldDirty: true });
      form.setValue("model", "", { shouldDirty: true });
      form.setValue("series", "", { shouldDirty: true });
    }
    prevBrandRef.current = brand;
  }, [brand, form]);

  useEffect(() => {
    if (prevProductNameRef.current !== undefined && prevProductNameRef.current !== productName) {
      form.setValue("model", "", { shouldDirty: true });
      form.setValue("series", "", { shouldDirty: true });
    }
    prevProductNameRef.current = productName;
  }, [productName, form]);

  useEffect(() => {
    if (prevModelRef.current !== undefined && prevModelRef.current !== model) {
      form.setValue("series", "", { shouldDirty: true });
    }
    prevModelRef.current = model;
  }, [model, form]);

  // Category creation dialog state
  const [catDialogOpen, setCatDialogOpen] = useState(false);
  const [catDialogMode, setCatDialogMode] = useState<CategoryDialogMode>("main");

  const openQuickCreate = (entity: QuickCreateEntity) => {
    setQuickCreateEntity(entity);
    setQuickCreateName("");
    setQuickCreateOpen(true);
  };

  const quickCreateTitles = {
    brands: { title: "Add Brand", label: "Brand Name" },
    products: { title: "Add Product Name", label: "Product Name" },
    models: { title: "Add Model", label: "Model Name" },
    series: { title: "Add Series", label: "Series Name" },
  };

  const handleQuickCreate = async () => {
    const name = quickCreateName.trim();
    if (!name) {
      toast.error("Name is required");
      return;
    }
    setQuickCreateSaving(true);
    try {
      let payload: any = { entity: quickCreateEntity, name };

      if (quickCreateEntity === "brands") {
        payload.subcategories = subcategory ? [subcategory] : [];
      } else if (quickCreateEntity === "products") {
        payload.brands = brand ? [brand] : [];
      } else if (quickCreateEntity === "models") {
        payload.productTypes = selectedProductTypeId ? [selectedProductTypeId] : [];
      } else if (quickCreateEntity === "series") {
        payload.models = model ? [model] : [];
      }

      const created = await apiFetch<any>("/api/catalog", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      // Invalidate with parent-scoped query key so dropdown refreshes
      if (quickCreateEntity === "brands") {
        queryClient.invalidateQueries({ queryKey: ["catalog", "brands", subcategory ?? ""] });
        form.setValue("brand", created.id, { shouldDirty: true });
      } else if (quickCreateEntity === "products") {
        queryClient.invalidateQueries({ queryKey: ["catalog", "products", brand ?? ""] });
        form.setValue("name", created.name, { shouldDirty: true });
      } else if (quickCreateEntity === "models") {
        queryClient.invalidateQueries({ queryKey: ["catalog", "models", selectedProductTypeId ?? ""] });
        form.setValue("model", created.id, { shouldDirty: true });
      } else {
        queryClient.invalidateQueries({ queryKey: ["catalog", "series", model ?? ""] });
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
        <FormItem className="space-y-1">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="w-[110px] shrink-0 text-right">Category</FormLabel>
            <div className="flex gap-1 items-center flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <Select value={field.value} onValueChange={(v) => {
                  field.onChange(v);
                  form.setValue("subcategory", "");
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
          </div>
          <FormMessage className="ml-[33%] pl-3" />
        </FormItem>
      )} />

      {/* 2. Sub-category */}
      <FormField control={control} name="subcategory" render={({ field }) => (
        <FormItem className="space-y-1">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="w-[110px] shrink-0 text-right">Sub-category <span className="text-destructive">*</span></FormLabel>
            <div className="flex gap-1 items-center flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <Select
                  value={field.value}
                  onValueChange={(v) => {
                    field.onChange(v);
                    // Reset downstream when subcategory changes
                    form.setValue("brand", "", { shouldDirty: true });
                    form.setValue("name", "", { shouldDirty: true });
                    form.setValue("model", "", { shouldDirty: true });
                    form.setValue("series", "", { shouldDirty: true });
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
          <FormMessage className="ml-[33%] pl-3" />
        </FormItem>
      )} />

      {/* 3. Brand */}
      <FormField control={control} name="brand" render={({ field }) => (
        <FormItem className="space-y-1">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="w-[110px] shrink-0 text-right">Brand</FormLabel>
            <div className="flex gap-1 items-center flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <AsyncSuggest
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v)}
                  placeholder="Search brand..."
                  allowClear
                  disabled={!subcategory}
                  defaultOptions={brands.map((b: any) => ({ value: b.id, label: b.name }))}
                  fetchOptions={async (search) => {
                    const res = await apiFetch<any[]>(
                      `/api/catalog?entity=brands&search=${encodeURIComponent(search)}${subcategory ? `&subcategory=${encodeURIComponent(subcategory)}` : ""}`
                    );
                    return res.map((b: any) => ({ value: b.id, label: b.name }));
                  }}
                />
              </div>
              <Button
                type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0"
                onClick={() => openQuickCreate("brands")}
                disabled={!subcategory}
                title="Add new brand"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <FormMessage className="ml-[33%] pl-3" />
        </FormItem>
      )} />

      {/* 4. Product Name */}
      <FormField control={control} name="name" render={({ field }) => (
        <FormItem className="space-y-1">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="w-[110px] shrink-0 text-right">Product Name <span className="text-destructive">*</span></FormLabel>
            <div className="flex gap-1 items-center flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <AsyncSuggest
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v)}
                  placeholder="Search product name..."
                  disabled={!brand}
                  defaultOptions={products.map((p: any) => ({ value: p.name, label: productDisplayName(p) }))}
                  fetchOptions={async (search) => {
                    const res = await apiFetch<any[]>(
                      `/api/catalog?entity=products&search=${encodeURIComponent(search)}${brand ? `&brandId=${brand}` : ""}`
                    );
                    return res.map((p: any) => ({ value: p.name, label: productDisplayName(p) }));
                  }}
                />
              </div>
              <Button
                type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0"
                onClick={() => openQuickCreate("products")}
                disabled={!brand}
                title="Add new product name"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <FormMessage className="ml-[33%] pl-3" />
        </FormItem>
      )} />

      {/* 5. Model */}
      <FormField control={control} name="model" render={({ field }) => (
        <FormItem className="space-y-1">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="w-[110px] shrink-0 text-right">Model</FormLabel>
            <div className="flex gap-1 items-center flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <AsyncSuggest
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v)}
                  placeholder="Search model..."
                  allowClear
                  disabled={!productName}
                  defaultOptions={models.map((m: any) => ({ value: m.id, label: m.name }))}
                  fetchOptions={async (search) => {
                    const res = await apiFetch<any[]>(
                      `/api/catalog?entity=models&search=${encodeURIComponent(search)}${selectedProductTypeId ? `&productTypeId=${selectedProductTypeId}` : ""}`
                    );
                    return res.map((m: any) => ({ value: m.id, label: m.name }));
                  }}
                />
              </div>
              <Button
                type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0"
                onClick={() => openQuickCreate("models")}
                disabled={!productName}
                title="Add new model"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <FormMessage className="ml-[33%] pl-3" />
        </FormItem>
      )} />

      {/* 6. Series */}
      <FormField control={control} name="series" render={({ field }) => (
        <FormItem className="space-y-1">
          <div className="flex flex-row items-center gap-2">
            <FormLabel className="w-[110px] shrink-0 text-right">Series</FormLabel>
            <div className="flex gap-1 items-center flex-1 min-w-0">
              <div className="flex-1 min-w-0">
                <AsyncSuggest
                  value={field.value ?? ""}
                  onValueChange={(v) => field.onChange(v)}
                  placeholder="Search series..."
                  allowClear
                  disabled={!model}
                  defaultOptions={seriesList.map((s: any) => ({ value: s.id, label: s.name }))}
                  fetchOptions={async (search) => {
                    const res = await apiFetch<any[]>(
                      `/api/catalog?entity=series&search=${encodeURIComponent(search)}${model ? `&modelId=${model}` : ""}`
                    );
                    return res.map((s: any) => ({ value: s.id, label: s.name }));
                  }}
                />
              </div>
              <Button
                type="button" size="icon" variant="outline" className="h-10 w-10 shrink-0"
                onClick={() => openQuickCreate("series")}
                disabled={!model}
                title="Add new series"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <FormMessage className="ml-[33%] pl-3" />
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
            <DialogTitle>{quickCreateTitles[quickCreateEntity].title}</DialogTitle>
            <DialogDescription>
              Create a new global {quickCreateEntity.replace(/s$/, '')}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label>{quickCreateTitles[quickCreateEntity].label} <span className="text-destructive">*</span></Label>
              <Input
                autoFocus
                placeholder="e.g. Dahua, Smart TV..."
                value={quickCreateName}
                onChange={(e) => setQuickCreateName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleQuickCreate();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuickCreateOpen(false)}>Cancel</Button>
            <LoadingButton loading={quickCreateSaving} onClick={handleQuickCreate}>Save</LoadingButton>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
