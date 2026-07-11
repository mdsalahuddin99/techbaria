"use client";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { formatCurrency, productDisplayName } from "@/shared/lib/format";
import { categoryName } from "@/shared/lib/categoryName";
import { useLocale } from "@/features/i18n";
import { Plus, ShieldAlert, ShieldX, ShieldCheck, Printer, ShoppingCart, Eye, EyeOff, Sparkles, Tag } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { getWarrantyStatus, formatWarrantyEnd } from "@/features/products/warranty";
import type { Product } from "@/shared/lib/types";
import { effectiveReorderPoint, suggestedPoQty } from "@/features/products/bundle";
import { useUpdateProduct } from "@/features/products/hooks";
import { useState } from "react";

interface InventoryProductMobileListProps {
  products: Product[];
  onQuickAdjust: (productId: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onPrintLabel?: (product: Product) => void;
  onQuickEditPrice?: (product: Product) => void;
}

/** Mobile card list of inventory rows. */
export function InventoryProductMobileList({
  products,
  onQuickAdjust,
  onEdit,
  onDelete,
  onPrintLabel,
  onQuickEditPrice,
}: InventoryProductMobileListProps) {
  const locale = useLocale();
  const updateProduct = useUpdateProduct();
  const [showPrices, setShowPrices] = useState<Set<string>>(new Set());

  const showPrice = (id: string) => setShowPrices((prev) => new Set(prev).add(id));
  const hidePrice = (id: string) => setShowPrices((prev) => {
    const next = new Set(prev);
    next.delete(id);
    return next;
  });

  return (
    <div className="md:hidden space-y-2">
      {products.map((p) => {
        const out = p.stock === 0;
        const reorderPoint = effectiveReorderPoint(p);
        const needsReorder = p.stock <= reorderPoint;
        const low = !out && needsReorder;
        const w = getWarrantyStatus(p);
        const warrantyHighlight =
          w.kind === "expired" || (w.kind === "active" && w.nearExpiry);
        return (
          <Card
            key={p.id}
            className={cn(
              "p-3",
              w.kind === "expired" && "border-destructive/50 bg-destructive/5",
              w.kind === "active" && w.nearExpiry && "border-warning/50 bg-warning/5",
            )}
          >
            <div className="flex items-center gap-3">
              {p.imageUrl ? (
                <Image src={p.imageUrl} alt={productDisplayName(p)} width={48} height={48} className="h-12 w-12 rounded-lg object-cover border shrink-0" />
              ) : (
                <span className="h-12 w-12 grid place-items-center text-2xl rounded-lg bg-secondary shrink-0">{p.emoji}</span>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-sm truncate">{productDisplayName(p)}</p>
                  {out ? <Badge variant="outline" className="border-destructive text-destructive shrink-0">Out</Badge> :
                   low ? <Badge variant="outline" className="border-warning text-warning shrink-0">Low</Badge> :
                         <Badge variant="outline" className="border-accent text-accent shrink-0">OK</Badge>}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {p.sku} · {categoryName(p)}
                </p>
                <div className="flex items-center justify-between mt-1.5 text-xs">
                  <span><span className="font-semibold text-foreground">{p.stock}</span> {p.unit} · Min/Reord: {p.minStock}/{reorderPoint}</span>
                  <div className="flex items-center gap-1.5">
                    {showPrices.has(p.id) ? (
                      <span className="text-slate-600 font-medium">
                        {formatCurrency(p.costPrice, locale)} / {formatCurrency(p.price, locale)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground italic tracking-widest opacity-50">••••••</span>
                    )}
                    <button
                      className="p-1 -mr-1 text-muted-foreground active:scale-95 transition-transform cursor-pointer select-none touch-manipulation"
                      onPointerDown={() => showPrice(p.id)}
                      onPointerUp={() => hidePrice(p.id)}
                      onPointerLeave={() => hidePrice(p.id)}
                      onContextMenu={(e) => e.preventDefault()}
                    >
                      {showPrices.has(p.id) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                {w.kind !== "none" && (
                  <div className="mt-1 text-[11px]">
                    {w.kind === "expired" ? (
                      <span className="inline-flex items-center gap-1 text-destructive font-medium">
                        <ShieldX className="h-3 w-3" />
                        Warranty শেষ · {formatWarrantyEnd(w.endDate)}
                      </span>
                    ) : w.nearExpiry ? (
                      <span className="inline-flex items-center gap-1 text-warning font-medium">
                        <ShieldAlert className="h-3 w-3" />
                        {w.daysLeft}d বাকি · {formatWarrantyEnd(w.endDate)}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <ShieldCheck className="h-3 w-3 text-accent" />
                        Warranty: {formatWarrantyEnd(w.endDate)}
                      </span>
                    )}
                    {p.warrantyStartDate && (
                      <span className="ml-3 text-muted-foreground">
                        (Pur: {new Date(p.warrantyStartDate).toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: '2-digit' })})
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-1.5 mt-2.5">
              <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => updateProduct.mutate({ id: p.id, patch: { active: !p.active } })}>
                {p.active ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                {p.active ? "Web Off" : "Web On"}
              </Button>
              {onQuickEditPrice && (
                <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => onQuickEditPrice(p)}>
                  <Tag className="h-3.5 w-3.5 mr-1" /> Price
                </Button>
              )}
              <Button size="sm" variant="outline" className="flex-1 h-9" onClick={() => updateProduct.mutate({ id: p.id, patch: { isTrending: !p.isTrending } })}>
                <Sparkles className={cn("h-3.5 w-3.5 mr-1", p.isTrending && "text-amber-500")} />
                {p.isTrending ? "Untrend" : "Trend"}
              </Button>
              {needsReorder && p.type !== "bundle" && (
                <Button asChild size="icon" variant="outline" className="h-9 w-9 shrink-0 text-primary border-primary/40" title="Create PO">
                  <Link
                    href={`/purchases?createPO=${p.id}&qty=${suggestedPoQty(p)}${p.supplierId ? `&supplier=${p.supplierId}` : ""}`}
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Link>
                </Button>
              )}
              {onPrintLabel && (
                <Button size="icon" variant="ghost" className="h-9 w-9 shrink-0" onClick={() => onPrintLabel(p)} title="Print label">
                  <Printer className="h-4 w-4" />
                </Button>
              )}
            </div>
          </Card>
        );
      })}
      {products.length === 0 && (
        <p className="text-center py-10 text-muted-foreground text-sm">No products match.</p>
      )}
    </div>
  );
}
