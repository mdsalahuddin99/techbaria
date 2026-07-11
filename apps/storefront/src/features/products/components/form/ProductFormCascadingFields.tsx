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

  // Fetch independent global lists
  const { data: brands = [] } = useQuery({
    queryKey: ["catalog", "brands"],
    queryFn: () => apiFetch<any[]>(`/api/catalog?entity=brands`),
  });

  const { data: products = [] } = useQuery({
    queryKey: ["catalog", "products"],
    queryFn: () => apiFetch<any[]>(`/api/catalog?entity=products`),
  });

  const { data: models = [] } = useQuery({
    queryKey: ["catalog", "models"],
    queryFn: () => apiFetch<any[]>(`/api/catalog?entity=models`),
  });

  const { data: seriesList = [] } = useQuery({
    queryKey: ["catalog", "series"],
    queryFn: () => apiFetch<any[]>(`/api/catalog?entity=series`),
  });

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
      const payload: any = { entity: quickCreateEntity, name };
      const created = await apiFetch<any>("/api/catalog", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      queryClient.invalidateQueries({ queryKey: ["catalog", quickCreateEntity] });
      
      if (quickCreateEntity === "brands") {
        form.setValue("brand", created.id, { shouldDirty: true });
      } else if (quickCreateEntity === "products") {
        form.setValue("name", created.name, { shouldDirty: true });
      } else if (quickCreateEntity === "models") {
        form.setValue("model", created.id, { shouldDirty: true });
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
                onValueChange={(v) => field.onChange(v)}
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
                onValueChange={(v) => field.onChange(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={brands.length === 0 ? "No brands available" : "Select brand"}>
                    {brands.find((b: any) => b.id === field.value)?.name || (editing?.globalBrandId === field.value ? (editing as any).globalBrand?.name : field.value) || ""}
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
                onValueChange={(v) => field.onChange(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={products.length === 0 ? "No products available" : "Select product name"}>
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
                onValueChange={(v) => field.onChange(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={models.length === 0 ? "No models available" : "Select model"}>
                    {models.find((m: any) => m.id === field.value)?.name || (editing?.globalModelId === field.value ? (editing as any).globalModel?.name : field.value) || ""}
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
                onValueChange={(v) => field.onChange(v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder={seriesList.length === 0 ? "No series available" : "Select series"}>
                    {seriesList.find((s: any) => s.id === field.value)?.name || (editing?.globalSeriesId === field.value ? (editing as any).globalSeries?.name : field.value) || ""}
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
