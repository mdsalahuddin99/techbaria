import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Checkbox } from "@/shared/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { formatCurrency, productDisplayName } from "@/shared/lib/format";
import { categoryName } from "@/shared/lib/categoryName";
import { useLocale } from "@/features/i18n";
import { Plus, Pencil, Trash2, ShieldCheck, ShieldAlert, ShieldX, Printer, ShoppingCart, MoreHorizontal } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { getWarrantyStatus, formatWarrantyEnd } from "@/features/products/warranty";
import type { Product } from "@/shared/lib/types";
import { effectiveReorderPoint, suggestedPoQty } from "@/features/products/bundle";

interface InventoryProductTableProps {
  products: Product[];
  onQuickAdjust: (productId: string) => void;
  onEdit: (product: Product) => void;
  onDelete: (productId: string) => void;
  onPrintLabel?: (product: Product) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (productId: string) => void;
  onToggleAll?: (allSelected: boolean) => void;
}

/** Desktop table view of inventory rows. */
export function InventoryProductTable({
  products,
  onQuickAdjust,
  onEdit,
  onDelete,
  onPrintLabel,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: InventoryProductTableProps) {
  const locale = useLocale();
  const selectable = !!selectedIds && !!onToggleSelect;
  const allSelected =
    selectable && products.length > 0 && products.every((p) => selectedIds!.has(p.id));
  const someSelected =
    selectable && products.some((p) => selectedIds!.has(p.id)) && !allSelected;

  return (
    <Card className="hidden md:block">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              {selectable && (
                <TableHead className="w-10">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={(v) => onToggleAll?.(!!v)}
                    aria-label="Select all"
                  />
                </TableHead>
              )}
              <TableHead>Product</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="hidden lg:table-cell">Sub-category</TableHead>
              <TableHead className="text-right">Stock</TableHead>
              <TableHead className="text-right">Min</TableHead>
              <TableHead className="text-right">Reorder</TableHead>
              <TableHead className="text-right">Cost</TableHead>
              <TableHead className="text-right">Value</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="whitespace-nowrap">Warranty</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.map((p) => {
              const out = p.stock === 0;
              const reorderPoint = effectiveReorderPoint(p);
              const needsReorder = p.stock <= reorderPoint;
              const low = !out && needsReorder;
              const w = getWarrantyStatus(p);
              const warrantyHighlight =
                w.kind === "expired" || (w.kind === "active" && w.nearExpiry);
              const isSelected = selectable && selectedIds!.has(p.id);
              return (
                <TableRow
                  key={p.id}
                  className={cn(
                    warrantyHighlight && "bg-warning/5 hover:bg-warning/10",
                    w.kind === "expired" && "bg-destructive/5 hover:bg-destructive/10",
                    isSelected && "bg-primary/5",
                  )}
                >
                  {selectable && (
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => onToggleSelect!(p.id)}
                        aria-label={`Select ${productDisplayName(p)}`}
                      />
                    </TableCell>
                  )}
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      {p.imageUrl ? (
                        <Image src={p.imageUrl} alt={productDisplayName(p)} width={32} height={32} className="h-8 w-8 rounded object-cover border" />
                      ) : (
                        <span className="h-8 w-8 grid place-items-center text-lg">{p.emoji}</span>
                      )}
                      <span>{productDisplayName(p)}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{p.sku}</TableCell>
                  <TableCell><Badge variant="secondary">{categoryName(p)}</Badge></TableCell>
                  <TableCell className="hidden lg:table-cell text-muted-foreground text-sm">{p.subcategory || "—"}</TableCell>
                  <TableCell className="text-right font-medium">{p.stock} {p.unit}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{p.minStock}</TableCell>
                  <TableCell className={cn("text-right text-sm", needsReorder && "text-warning font-semibold")}>
                    {reorderPoint}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(p.costPrice, locale)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(p.stock * p.costPrice, locale)}</TableCell>
                  <TableCell>
                    {out ? <Badge variant="outline" className="border-destructive text-destructive">Out</Badge> :
                     low ? <Badge variant="outline" className="border-warning text-warning">Low</Badge> :
                           <Badge variant="outline" className="border-accent text-accent">OK</Badge>}
                  </TableCell>
                  <TableCell className="text-xs whitespace-nowrap">
                    {w.kind === "none" ? (
                      <span className="text-muted-foreground">—</span>
                    ) : w.kind === "expired" ? (
                      <span className="inline-flex items-center gap-1 text-destructive font-medium" title={`Expired ${w.daysAgo}d ago`}>
                        <ShieldX className="h-3.5 w-3.5" />
                        {formatWarrantyEnd(w.endDate)}
                      </span>
                    ) : w.nearExpiry ? (
                      <span className="inline-flex items-center gap-1 text-warning font-medium" title={`${w.daysLeft} days left`}>
                        <ShieldAlert className="h-3.5 w-3.5" />
                        {formatWarrantyEnd(w.endDate)} · {w.daysLeft}d
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground" title={`${w.daysLeft} days left`}>
                        <ShieldCheck className="h-3.5 w-3.5 text-accent" />
                        {formatWarrantyEnd(w.endDate)}
                      </span>
                    )}
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
                        {needsReorder && p.type !== "bundle" && (
                          <DropdownMenuItem asChild>
                            <Link href={`/purchases?createPO=${p.id}&qty=${suggestedPoQty(p)}${p.supplierId ? `&supplier=${p.supplierId}` : ""}`} className="w-full flex items-center text-primary focus:text-primary">
                              <ShoppingCart className="mr-2 h-4 w-4" /> Create PO
                            </Link>
                          </DropdownMenuItem>
                        )}
                        {onPrintLabel && (
                          <DropdownMenuItem onClick={() => onPrintLabel(p)}>
                            <Printer className="mr-2 h-4 w-4" /> Print Label
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => onQuickAdjust(p.id)}>
                          <Plus className="mr-2 h-4 w-4" /> Quick Adjust
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEdit(p)}>
                          <Pencil className="mr-2 h-4 w-4" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => onDelete(p.id)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {products.length === 0 && (
              <TableRow><TableCell colSpan={selectable ? 12 : 11} className="text-center py-10 text-muted-foreground">No products match.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}
