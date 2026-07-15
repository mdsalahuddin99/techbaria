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
import { ProductFormCascadingFields } from "./components/form/ProductFormCascadingFields";
import { ProductFormImageFields } from "./components/form/ProductFormImageFields";
import { ProductFormBasicFields } from "./components/form/ProductFormBasicFields";
import { ProductFormAdvancedFields } from "./components/form/ProductFormAdvancedFields";

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
  unit: "pcs", active: false, emoji: "📦",
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
        galleryImages: (rest as any).galleryImages ?? [],
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
      slug: editing?.slug || values.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, ""),
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
      galleryImages: values.galleryImages || undefined,
      supplierId: values.supplierId ?? undefined,
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
      <DialogContent className="sm:max-w-2xl lg:max-w-4xl max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogDescription className="sr-only">
          {editing ? "Edit product details" : "Add a new product"}
        </DialogDescription>
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between gap-2 pr-8">
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
  const type = useWatch({ name: "type", control });
  const submitting = loading ?? form.formState.isSubmitting;

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <ProductFormCascadingFields form={form} editing={editing} />
      
      {/* ── Show more fields: color / storage / ram ── */}
      {advanced && <ProductFormAdvancedFields form={form} />}

      <ProductFormBasicFields form={form} />
      <ProductFormImageFields form={form} />

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

