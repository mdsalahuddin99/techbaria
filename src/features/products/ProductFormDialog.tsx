import { useEffect, useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/shared/ui/dialog";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/shared/ui/form";
import { Input } from "@/shared/ui/input";
import { Textarea } from "@/shared/ui/textarea";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { Plus } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { Label } from "@/shared/ui/label";
import { AutoSuggest } from "@/shared/ui/auto-suggest";
import { Product, Category } from "@/shared/lib/types";
import { productSchema, ProductFormValues } from "./schemas";
import { useCreateProduct, useUpdateProduct, useProducts } from "./hooks";
import { useDistinctValues } from "./hooks/useDistinctValues";
import { productDisplayName } from "@/shared/lib/format";
import { generateEan13 } from "@/shared/lib/barcode";
import { cn } from "@/shared/lib/utils";
import { findDuplicateIdentifiers } from "./warranty";
import { BundleComponentsEditor } from "./components/BundleComponentsEditor";
import ImageUpload from "@/components/ImageUpload";
import { toast } from "sonner";
import { CategoryFormDialog, type CategoryDialogMode } from "@/features/categories/components/CategoryFormDialog";
import { listCategories } from "@/shared/api-client/categories";
import { apiFetch } from "@/shared/api-client/fetch";
import { useQuery, useQueryClient } from "@tanstack/react-query";

const EMOJIS = ["📦", "📱", "💻", "🖥️", "🎧", "⌚", "🔌", "📷", "🛰️", "🧰"];

const defaults: ProductFormValues = {
  name: "", sku: "", barcode: "", category: "",
  description: "",
  shortDescription: "",
  price: "" as unknown as number,
  costPrice: "" as unknown as number,
  wholesalePrice: "" as unknown as number,
  stock: "" as unknown as number,
  minStock: 5,
  unit: "pcs", active: true, emoji: "📦",
  imageUrl: "", supplierId: null,
  subcategory: "", series: "",
  brand: "", model: "", serialNumber: "", imei: "",
  color: "", storage: "", ram: "",
  warrantyMonths: "" as unknown as number,
  warrantyStartDate: "",
  condition: "" as unknown as "New",
  trackSerials: false,
  type: "simple",
  components: [],
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Product | null;
  prefillBarcode?: string;
  onScanRequest?: () => void;
}

export function ProductFormDialog({
  open, onOpenChange, editing, prefillBarcode,
}: Props) {
  const create = useCreateProduct();
  const update = useUpdateProduct();
  const { data: allProducts = [] } = useProducts();
  const [advanced, setAdvanced] = useState(false);

  const form = useForm<ProductFormValues, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: defaults,
  });

  // ── Track whether we already applied the initial barcode ──────────────
  const appliedBarcodeRef = useRef<string | undefined>(undefined);
  const resumedRef = useRef(false);

  // Form reset on open / editing change (EXCLUDES mid-dialog prefillBarcode changes)
  useEffect(() => {
    if (!open) {
      appliedBarcodeRef.current = undefined;
      resumedRef.current = false;
      return;
    }
    // Prevent re-entering during Radix Dialog animation lifecycle
    if (resumedRef.current) return;
    resumedRef.current = true;
    if (editing) {
      const { id, ...rest } = editing;
      form.reset({
        // defaults covers ALL schema fields — then we override with rest values
        ...defaults,
        name: rest.name ?? defaults.name,
        sku: rest.sku ?? defaults.sku,
        barcode: rest.barcode ?? defaults.barcode,
        category: rest.category ?? "",
        subcategory: rest.subcategory ?? "",
        series: rest.seriesId ?? rest.series ?? "",
        brand: rest.brandId ?? rest.brand ?? "",
        model: rest.modelId ?? rest.model ?? "",
        price: (rest.price ?? defaults.price) as unknown as number,
        costPrice: (rest.costPrice ?? defaults.costPrice) as unknown as number,
        wholesalePrice: (rest.wholesalePrice ?? defaults.wholesalePrice) as unknown as number,
        stock: (rest.stock ?? defaults.stock) as unknown as number,
        minStock: rest.minStock ?? defaults.minStock,
        unit: rest.unit ?? defaults.unit,
        active: rest.active ?? defaults.active,
        description: (rest as any).description ?? "",
        shortDescription: (rest as any).shortDescription ?? "",
        emoji: rest.emoji ?? defaults.emoji,
        imageUrl: rest.imageUrl ?? "",
        supplierId: rest.supplierId ?? null,
        color: rest.color ?? "",
        storage: rest.storage ?? "",
        ram: rest.ram ?? "",
        warrantyMonths: (rest.warrantyMonths ?? "") as unknown as number,
        warrantyStartDate: rest.warrantyStartDate
          ? (() => {
              const d = new Date(rest.warrantyStartDate);
              return isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
            })()
          : "",
        condition: (rest.condition ?? "") as unknown as "New",
        trackSerials: rest.trackSerials ?? true,
        serialNumber: rest.serialNumber ?? "",
        imei: rest.imei ?? "",
        type: rest.type ?? "simple",
        components: rest.components ?? [],
      });
      appliedBarcodeRef.current = undefined;
    } else {
      form.reset({
        ...defaults,
        sku: `SKU-${Date.now().toString().slice(-5)}`,
        barcode: prefillBarcode ?? "",
        category: "",
      });
      appliedBarcodeRef.current = prefillBarcode ?? undefined;
    }
    // Intentionally exclude prefillBarcode — mid-dialog updates use setValue below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, form]);

  // Mid-dialog barcode update (lightweight setValue, avoids full reset → Radix loop)
  useEffect(() => {
    if (!open || editing || !prefillBarcode) return;
    if (prefillBarcode === appliedBarcodeRef.current) return;
    appliedBarcodeRef.current = prefillBarcode;
    form.setValue("barcode", prefillBarcode, { shouldDirty: true });
  }, [open, editing, prefillBarcode, form]);

  const buildPayload = (values: ProductFormValues): Omit<Product, "id"> => {
    const existingBarcodes = allProducts
      .filter((p) => p.id !== editing?.id)
      .map((p) => p.barcode)
      .filter(Boolean);
    const finalBarcode = values.barcode?.trim() || generateEan13(existingBarcodes);
    const warranty = Number(values.warrantyMonths) || undefined;

    // Pricing/stock are filled from purchases. For new catalog entries
    // they default to 0; for edits we keep existing values.
    const price = Number(values.price) || editing?.price || 0;
    const costPrice = Number(values.costPrice) || editing?.costPrice || 0;
    const wholesalePrice = Number(values.wholesalePrice) || editing?.wholesalePrice || 0;
    const stock = Number(values.stock) || editing?.stock || 0;

    return {
      name: values.name,
      sku: values.sku,
      barcode: finalBarcode,
      category: values.category as Category,
      subcategory: values.subcategory?.trim() || undefined,
      // Send FK IDs directly — backend resolveBrandId detects cuid and skips name lookup
      series: values.series?.trim() || undefined,
      price,
      costPrice,
      wholesalePrice,
      stock,
      minStock: values.minStock,
      unit: values.unit,
      active: values.active,
      description: values.description?.trim() || undefined,
      shortDescription: values.shortDescription?.trim() || undefined,
      emoji: values.emoji,
      imageUrl: values.imageUrl || undefined,
      supplierId: values.supplierId ?? null,
      brand: values.brand?.trim() || undefined,
      model: values.model?.trim() || undefined,
      serialNumber: values.serialNumber?.trim() || undefined,
      imei: values.imei?.trim() || undefined,
      color: values.color?.trim() || undefined,
      storage: values.storage?.trim() || undefined,
      ram: values.ram?.trim() || undefined,
      warrantyMonths: warranty,
      warrantyStartDate: values.warrantyStartDate?.trim() || editing?.warrantyStartDate,
      condition: (values.condition || undefined) as Product["condition"],
      trackSerials: values.trackSerials ?? true,
      serials: editing?.serials,
      type: values.type ?? "simple",
      components:
        values.type === "bundle"
          ? (values.components ?? [])
              .filter((c): c is { productId: string; qty: number } => !!c.productId && (c.qty ?? 0) > 0)
          : undefined,
    };
  };

  const onSubmit = async (values: ProductFormValues) => {
    // IMEI / Serial uniqueness across catalog (case-insensitive).
    const imei = values.imei?.trim();
    const sn = values.serialNumber?.trim();
    if (imei || sn) {
      const dup = findDuplicateIdentifiers(allProducts, {
        id: editing?.id, imei, serialNumber: sn,
      });
      if (dup.imei) {
        toast.error(`IMEI "${imei}" already used by "${dup.imei.name}"`);
        return;
      }
      if (dup.serialNumber) {
        toast.error(`Serial "${sn}" already used by "${dup.serialNumber.name}"`);
        return;
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { serialNumber, imei: _imei, serials, components, ...payload } = buildPayload(values);
    if (editing) {
      await update.mutateAsync({ id: editing.id, patch: payload });
    } else {
      await create.mutateAsync(payload);
    }
    onOpenChange(false);
  };

  const submitting = create.isPending || update.isPending;

  return (
    <Dialog key={editing?.id ?? "new-product"} open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl xl:max-w-5xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogDescription className="sr-only">
          {editing ? "Edit product details" : "Add a new product"}
        </DialogDescription>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2">
            <span>{editing ? "Edit" : "Add"} Product</span>
            <div className="flex items-center gap-2 text-xs font-normal">
              <Label htmlFor="adv-mode" className="text-muted-foreground cursor-pointer select-none">
                Show more fields
              </Label>
              <Switch id="adv-mode" checked={advanced} onCheckedChange={setAdvanced} />
            </div>
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            ক্যাটালগ template — দাম, stock এবং serial গুলো Purchase যোগ করার সময় বসবে।
          </p>
        </DialogHeader>
        <Form {...form}>
          <FormFields
            form={form}
            control={form.control}
            editing={editing}
            advanced={advanced}
            allProducts={allProducts}
            onOpenChange={onOpenChange}
            onSubmit={onSubmit}
            loading={submitting}
          />
        </Form>
      </DialogContent>
    </Dialog>
  );
}

// ═════════════════════════════════════════════════════════════════════════
// Inner form body — isolated component
// Uses useWatch() instead of form.watch() so re-renders from form field
// changes are LOCAL to this component only.
// ═════════════════════════════════════════════════════════════════════════
// NOTE: Defined BEFORE ProductFormDialog so HMR always sees it compiled.

type FormFieldsProps = {
  form: ReturnType<typeof useForm<ProductFormValues>>;
  control: ReturnType<typeof useForm<ProductFormValues>>["control"];
  editing: Product | null;
  advanced: boolean;
  allProducts: Product[];
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: ProductFormValues) => Promise<void>;
  loading?: boolean;
};

function FormFields({
  form, control, editing, advanced, allProducts,
  onOpenChange, onSubmit, loading,
}: FormFieldsProps) {
  const category = useWatch({ name: "category", control });
  const subcategory = useWatch({ name: "subcategory", control });
  const type = useWatch({ name: "type", control });
  const colorOptions = useDistinctValues("color");
  const storageOptions = useDistinctValues("storage");
  const ramOptions = useDistinctValues("ram");

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

  // Reset cascading selections when subcategory changes
  useEffect(() => {
    setSelectedBrandId("");
    setSelectedProductId("");
    setSelectedModelId("");
  }, [subcategoryId]);

  // Initialize selected IDs when editing (load from saved FK IDs)
  const initRef = useRef(false);
  useEffect(() => {
    if (!editing || initRef.current) return;
    initRef.current = true;
    // If the product already has FK IDs (from serializer), restore the cascade
    const bId = editing.brandId;
    const mId = editing.modelId;
    const sId = editing.seriesId;
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

  const submitting = loading ?? form.formState.isSubmitting;
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
        form.setValue("brand", created.id, { shouldDirty: true }); // store id
        setSelectedBrandId(created.id);
        setSelectedProductId("");
        setSelectedModelId("");
        form.setValue("name", "");
        form.setValue("model", "");
        form.setValue("series", "");
      } else if (quickCreateEntity === "products") {
        form.setValue("name", created.name, { shouldDirty: true }); // product name stored as text
        setSelectedProductId(created.id);
        setSelectedModelId("");
        form.setValue("model", "");
        form.setValue("series", "");
      } else if (quickCreateEntity === "models") {
        form.setValue("model", created.id, { shouldDirty: true }); // store id
        setSelectedModelId(created.id);

        form.setValue("series", "");
      } else {
        form.setValue("series", created.id, { shouldDirty: true }); // store series id
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
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* 1. Category — Select from parent categories */}
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
              type="button"
              size="icon"
              variant="outline"
              className="h-10 w-10 shrink-0"
              onClick={() => { setCatDialogMode("main"); setCatDialogOpen(true); }}
              title="Add new category"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          <FormMessage />
        </FormItem>
      )} />

      {/* 2. Sub-category — Select filtered by category */}
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
              type="button"
              size="icon"
              variant="outline"
              className="h-10 w-10 shrink-0"
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

      {/* 3. Brand — cascading Select (value = FK id) */}
      <FormField control={control} name="brand" render={({ field }) => (
        <FormItem>
          <FormLabel>Brand</FormLabel>
          <div className="flex gap-1 items-start">
            <div className="flex-1 min-w-0">
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => {
                  field.onChange(v); // store brand id
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
                    {/* Show name for display even though value is id */}
                    {brands.find((b: any) => b.id === field.value)?.name ?? ""}
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
              type="button"
              size="icon"
              variant="outline"
              className="h-10 w-10 shrink-0"
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

      {/* 4. Product Name — cascading Select (value = SubcategoryProduct name) */}
      <FormField control={control} name="name" render={({ field }) => (
        <FormItem>
          <FormLabel>Product Name <span className="text-destructive">*</span></FormLabel>
          <div className="flex gap-1 items-start">
            <div className="flex-1 min-w-0">
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => {
                  field.onChange(v); // store name directly
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
              type="button"
              size="icon"
              variant="outline"
              className="h-10 w-10 shrink-0"
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

      {/* 5. Model — cascading Select (value = SubcategoryModel id) */}
      <FormField control={control} name="model" render={({ field }) => (
        <FormItem>
          <FormLabel>Model</FormLabel>
          <div className="flex gap-1 items-start">
            <div className="flex-1 min-w-0">
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => {
                  field.onChange(v); // store model id
                  setSelectedModelId(v);
                  form.setValue("series", "");
                }}
                disabled={!selectedProductId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedProductId ? "Select product first" : models.length === 0 ? "No models available" : "Select model"}>
                    {models.find((m: any) => m.id === field.value)?.name ?? ""}
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
              type="button"
              size="icon"
              variant="outline"
              className="h-10 w-10 shrink-0"
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

      {/* 6. Series — cascading Select (value = SubcategorySeries id) */}
      <FormField control={control} name="series" render={({ field }) => (
        <FormItem>
          <FormLabel>Series</FormLabel>
          <div className="flex gap-1 items-start">
            <div className="flex-1 min-w-0">
              <Select
                value={field.value ?? ""}
                onValueChange={(v) => {
                  field.onChange(v); // store series id
                }}
                disabled={!selectedModelId}
              >
                <SelectTrigger>
                  <SelectValue placeholder={!selectedModelId ? "Select model first" : seriesList.length === 0 ? "No series available" : "Select series"}>
                    {seriesList.find((s: any) => s.id === field.value)?.name ?? ""}
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
              type="button"
              size="icon"
              variant="outline"
              className="h-10 w-10 shrink-0"
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

      {/* 7. Product Image + Emoji picker — side by side */}
      <FormField control={control} name="imageUrl" render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>Product Image</FormLabel>
          <div className="flex gap-4 items-start">
            <FormControl>
              <ImageUpload
                value={field.value || undefined}
                onChange={(url) => field.onChange(url ?? "")}
                fallbackEmoji="📷"
                size="md"
                allowDataUrlFallback
              />
            </FormControl>
            <FormField control={control} name="emoji" render={({ field: emojiField }) => (
              <div className="flex-1 min-w-0">
                <p className="text-xs text-muted-foreground mb-1.5">Icon (fallback)</p>
                <div className="grid grid-cols-5 gap-1.5 max-w-[13rem]">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => emojiField.onChange(e)}
                      className={cn(
                        "h-9 w-9 rounded-md border text-lg flex items-center justify-center transition-colors",
                        emojiField.value === e
                          ? "border-primary bg-primary/10 ring-1 ring-primary"
                          : "border-border hover:bg-muted"
                      )}
                      title={e}
                    >{e}</button>
                  ))}
                </div>
              </div>
            )} />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Upload to Cloudinary — if no image, the selected emoji will show as fallback.
          </p>
          <FormMessage />
        </FormItem>
      )} />

      {/* 8. SKU */}
      <FormField control={control} name="sku" render={({ field }) => (
        <FormItem>
          <FormLabel>SKU</FormLabel>
          <FormControl><Input {...field} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/* 9. Min Stock Alert */}
      <FormField control={control} name="minStock" render={({ field }) => (
        <FormItem>
          <FormLabel>Min Stock Alert</FormLabel>
          <FormControl><Input type="number" {...field} value={field.value ?? ""} /></FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/* Description */}
      <FormField control={control} name="description" render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>Description</FormLabel>
          <FormControl>
            <Textarea
              placeholder="Enter long product description here..."
              className="min-h-[100px]"
              {...field}
            />
          </FormControl>
          <FormMessage />
        </FormItem>
      )} />

      {/* Short Description */}
      <FormField control={control} name="shortDescription" render={({ field }) => (
        <FormItem className="sm:col-span-2">
          <FormLabel>Short Description</FormLabel>
          <FormControl>
            <Input
              placeholder="Enter a brief preview (max 300 chars)..."
              {...field}
            />
          </FormControl>
          <p className="text-[11px] text-muted-foreground mt-1">
            Used for storefront card preview. Max 300 characters.
          </p>
          <FormMessage />
        </FormItem>
      )} />

      {/* ── Show more fields: color / storage / ram / condition ── */}
      {advanced && (
        <>
          <FormField control={control} name="color" render={({ field }) => (
            <FormItem>
              <FormLabel>Color</FormLabel>
              <FormControl>
                <AutoSuggest
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  options={colorOptions.map((v) => ({ value: v, label: v }))}
                  placeholder="e.g. White / Black"
                  allowFreeText
                  allowClear
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="storage" render={({ field }) => (
            <FormItem>
              <FormLabel>Storage</FormLabel>
              <FormControl>
                <AutoSuggest
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  options={storageOptions.map((v) => ({ value: v, label: v }))}
                  placeholder="e.g. 256GB / 1TB"
                  allowFreeText
                  allowClear
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="ram" render={({ field }) => (
            <FormItem>
              <FormLabel>RAM</FormLabel>
              <FormControl>
                <AutoSuggest
                  value={field.value ?? ""}
                  onValueChange={field.onChange}
                  options={ramOptions.map((v) => ({ value: v, label: v }))}
                  placeholder="e.g. 8GB / 16GB"
                  allowFreeText
                  allowClear
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="condition" render={({ field }) => (
            <FormItem>
              <FormLabel>Condition</FormLabel>
              <Select value={field.value || "New"} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="New">New</SelectItem>
                  <SelectItem value="Used">Used</SelectItem>
                  <SelectItem value="Refurbished">Refurbished</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="warrantyMonths" render={({ field }) => (
            <FormItem>
              <FormLabel>Warranty (months)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  placeholder="e.g. 12, 24"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <FormField control={control} name="warrantyStartDate" render={({ field }) => (
            <FormItem>
              <FormLabel>Warranty Start Date</FormLabel>
              <FormControl>
                <Input
                  type="date"
                  {...field}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )} />
        </>
      )}

      <FormField control={control} name="trackSerials" render={({ field }) => (
        <FormItem className="sm:col-span-2 flex items-center justify-between p-3 rounded-md bg-secondary/50 space-y-0">
          <div>
            <FormLabel className="text-sm font-medium">Serial / Barcode tracked</FormLabel>
            <p className="text-xs text-muted-foreground">
              On হলে Purchase-এ প্রতিটা unit scan করতে হবে। Off করলে শুধু quantity লিখলেই চলবে (cable, accessory ইত্যাদির জন্য)।
            </p>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )} />

      {/* ---- Phase 4: Bundle ---- */}
      <FormField control={control} name="type" render={({ field }) => (
        <FormItem className="sm:col-span-2 flex items-center justify-between p-3 rounded-md bg-secondary/50 space-y-0">
          <div>
            <FormLabel className="text-sm font-medium">Bundle / Kit Product</FormLabel>
            <p className="text-xs text-muted-foreground">
              On করলে এটা কয়েকটা component product নিয়ে তৈরি bundle হিসেবে বিক্রি হবে।
            </p>
          </div>
          <FormControl>
            <Switch
              checked={field.value === "bundle"}
              onCheckedChange={(v) => field.onChange(v ? "bundle" : "simple")}
            />
          </FormControl>
        </FormItem>
      )} />

      {type === "bundle" && (
        <BundleComponentsEditor form={form} editingId={editing?.id} />
      )}

      <FormField control={control} name="active" render={({ field }) => (
        <FormItem className="sm:col-span-2 flex items-center justify-between p-3 rounded-md bg-secondary/50 space-y-0">
          <div>
            <FormLabel className="text-sm font-medium">Publish to Web & POS Active</FormLabel>
            <p className="text-xs text-muted-foreground">Controls if the product is active in POS and published on the e-commerce storefront.</p>
          </div>
          <FormControl>
            <Switch checked={field.value} onCheckedChange={field.onChange} />
          </FormControl>
        </FormItem>
      )} />

      <DialogFooter className="sm:col-span-2">
        <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
          Cancel
        </Button>
        <LoadingButton type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90" loading={submitting}>
          {editing ? "Save Changes" : "Add Product"}
        </LoadingButton>
      </DialogFooter>
    </form>
  );
}
