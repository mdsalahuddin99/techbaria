"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/shared/ui/dialog";
import { Badge } from "@/shared/ui/badge";
import { formatCurrency, productDisplayName } from "@/shared/lib/format";
import { categoryName } from "@/shared/lib/categoryName";
import type { Product } from "@/shared/lib/types";

interface Props {
  product: Product | null;
  onClose: () => void;
}

export function ProductDetailsDialog({ product, onClose }: Props) {
  if (!product) return null;

  const open = !!product;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {product.emoji && <span>{product.emoji}</span>}
            <span>{productDisplayName(product)}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image */}
          {product.imageUrl && (
            <div className="flex justify-center">
              <img
                src={product.imageUrl}
                alt={productDisplayName(product)}
                className="h-32 w-32 object-cover rounded-lg border"
              />
            </div>
          )}

          {/* Basic Info */}
          <Section title="Basic Information">
            <Row label="Type" value={<span className="capitalize">{product.type || "Simple"}</span>} />
            <Row label="SKU" value={product.sku} />
            <Row label="Barcode" value={product.barcode || "—"} />
            <Row label="Category" value={categoryName(product)} />
            <Row label="Subcategory" value={product.subcategory || "—"} />
            <Row label="Brand" value={product.brand || "—"} />
            <Row label="Model" value={product.model || "—"} />
            <Row label="Series" value={product.series || "—"} />
            <Row label="Unit" value={product.unit} />
            <Row label="Track Serials" value={product.trackSerials ? "Yes" : "No"} />
            <Row
              label="Status"
              value={
                product.active ? (
                  <Badge className="bg-accent text-accent-foreground">Active</Badge>
                ) : (
                  <Badge variant="secondary">Inactive</Badge>
                )
              }
            />
          </Section>

          {/* Pricing */}
          <Section title="Pricing">
            <Row label="Selling Price" value={formatCurrency(product.price)} />
            <Row label="Cost Price" value={formatCurrency(product.costPrice)} />
            <Row label="Wholesale Price" value={formatCurrency(product.wholesalePrice)} />
            <Row
              label="Margin"
              value={
                product.costPrice > 0
                  ? `${Math.round(((product.price - product.costPrice) / product.costPrice) * 100)}%`
                  : "—"
              }
            />
          </Section>

          {/* Stock */}
          <Section title="Stock">
            <Row label="In Stock" value={`${product.stock} ${product.unit}`} />
            <Row label="Min Stock" value={`${product.minStock} ${product.unit}`} />
          </Section>

          {/* Electronics Specs */}
          {(product.color || product.storage || product.ram) && (
            <Section title="Specifications">
              {product.color && <Row label="Color" value={product.color} />}
              {product.storage && <Row label="Storage" value={product.storage} />}
              {product.ram && <Row label="RAM" value={product.ram} />}
            </Section>
          )}

          {/* Warranty */}
          {(product.warrantyMonths || product.condition || product.warrantyStartDate) && (
            <Section title="Warranty & Condition">
              {product.warrantyMonths && (
                <Row label="Warranty" value={`${product.warrantyMonths} months`} />
              )}
              {product.warrantyStartDate && (
                <Row label="Warranty Starts" value={new Date(product.warrantyStartDate).toLocaleDateString()} />
              )}
              {product.condition && <Row label="Condition" value={product.condition} />}
            </Section>
          )}

          {/* Description */}
          {(product.shortDescription || product.description) && (
            <Section title="Description">
              {product.shortDescription && (
                <div className="mb-2">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Short</span>
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">
                    {product.shortDescription}
                  </p>
                </div>
              )}
              {product.description && (
                <div>
                  {product.shortDescription && <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Full</span>}
                  <p className="text-sm text-muted-foreground whitespace-pre-wrap mt-0.5">
                    {product.description}
                  </p>
                </div>
              )}
            </Section>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Helpers ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
        {title}
      </h4>
      <div className="space-y-1.5 bg-muted/30 rounded-lg p-3">
        {children}
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-center text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-right ml-4">{value}</span>
    </div>
  );
}
