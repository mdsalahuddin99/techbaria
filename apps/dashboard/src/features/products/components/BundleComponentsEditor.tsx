import { useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { useProductsQuery } from "../hooks";
import { Plus, Trash2 } from "lucide-react";
import { productDisplayName } from "@/shared/lib/format";
import type { ProductFormValues } from "../schemas";
import { bundleAvailableStock } from "../bundle";

interface Props {
  form: UseFormReturn<ProductFormValues, unknown, ProductFormValues>;
  editingId?: string;
}

/**
 * Inline editor for bundle components. Reads candidate products from the
 * store, excludes the bundle itself, and previews the derived stock.
 */
export function BundleComponentsEditor({ form, editingId }: Props) {
  const { data } = useProductsQuery();
  const products = ((data as any)?.items ?? []) as any[];
  const components = form.watch("components") ?? [];

  const candidates = useMemo(
    () => products.filter((p) => p.id !== editingId && p.type !== "bundle" && p.active),
    [products, editingId],
  );

  const setComponents = (next: typeof components) =>
    form.setValue("components", next, { shouldDirty: true });

  const add = () => setComponents([...(components ?? []), { productId: "", qty: 1 }]);
  const update = (idx: number, patch: Partial<{ productId: string; qty: number }>) =>
    setComponents(components.map((c, i) => (i === idx ? { ...c, ...patch } : c)));
  const remove = (idx: number) => setComponents(components.filter((_, i) => i !== idx));

  // Preview derived stock using current selections.
  const previewStock = useMemo(() => {
    const selected = (components ?? []).filter((c) => c.productId && (c.qty ?? 0) > 0);
    if (selected.length === 0) return 0;
    const fakeBundle = {
      id: editingId ?? "_preview",
      type: "bundle" as const,
      stock: 0,
      components: selected.map((c) => ({ productId: c.productId!, qty: c.qty! })),
    };
    return bundleAvailableStock(fakeBundle as never, products);
  }, [components, products, editingId]);

  return (
    <div className="sm:col-span-2 rounded-md border border-dashed p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">Bundle Components</p>
          <p className="text-xs text-muted-foreground">
            Bundle stock = ⌊min(component stock / qty)⌋. Available now: <span className="font-semibold text-foreground">{previewStock}</span>
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={add}>
          <Plus className="h-4 w-4 mr-1" /> Add
        </Button>
      </div>
      {(components ?? []).length === 0 && (
        <p className="text-xs text-muted-foreground italic">No components yet. Click Add.</p>
      )}
      {(components ?? []).map((c, idx) => (
        <div key={idx} className="flex gap-2 items-start">
          <div className="flex-1">
            <Select
              value={c.productId || undefined}
              onValueChange={(v) => update(idx, { productId: v })}
            >
              <SelectTrigger><SelectValue placeholder="Select product" /></SelectTrigger>
              <SelectContent>
                {candidates.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.emoji} {productDisplayName(p)} — stock {p.stock}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Input
            type="number"
            min={1}
            className="w-20"
            value={c.qty ?? 1}
            onChange={(e) => update(idx, { qty: Number(e.target.value) || 0 })}
          />
          <Button type="button" variant="ghost" size="icon" onClick={() => remove(idx)}>
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>
      ))}
    </div>
  );
}
