"use client";

import React, { useRef, useEffect, useCallback } from "react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { ScanLine, Camera, Trash2 } from "lucide-react";
import { formatCurrency, productDisplayName } from "@/shared/lib/format";

interface Category {
  id: string;
  name: string;
  parentId?: string | null;
}

interface Product {
  id: string;
  name: string;
  sku: string;
  barcode?: string;
  brand?: string;
  model?: string;
  price: number;
  stock: number;
  categoryId?: string;
  category?: string;
  subcategory?: string;
}

interface ProductFilterBarProps {
  categories: Category[];
  /** Products already pre-filtered to the selected branch's BranchStock (qty > 0) */
  availableProducts: Product[];
  /** Current rows in the invoice (to subtract already-added qty from available stock) */
  invoiceRows: Array<{ productId: string; qty: number }>;

  category: string;
  subcategory: string;
  searchQuery: string;
  showSuggestions: boolean;
  hasRows: boolean;

  onCategoryChange: (v: string) => void;
  onSubcategoryChange: (v: string) => void;
  onSearchChange: (v: string, show: boolean) => void;
  onShowSuggestions: (v: boolean) => void;
  onAddProduct: (productId: string) => void;
  onBarcodeEnter: (code: string) => Promise<void>;
  onClear: () => void;
  onOpenCamera: () => void;

  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ProductFilterBar({
  categories,
  availableProducts,
  invoiceRows,
  category,
  subcategory,
  searchQuery,
  showSuggestions,
  hasRows,
  onCategoryChange,
  onSubcategoryChange,
  onSearchChange,
  onShowSuggestions,
  onAddProduct,
  onBarcodeEnter,
  onClear,
  onOpenCamera,
  searchInputRef,
}: ProductFilterBarProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // ── Derived data ──────────────────────────────────────────────────────────
  const parentCategories = categories.filter((c) => !c.parentId);
  const selectedCat = categories.find((c) => c.name === category);
  const subcategories = categories.filter(
    (c) => selectedCat && c.parentId === selectedCat.id,
  );

  const filteredProducts = availableProducts.filter((p) => {
    // Exclude products where available qty would be 0 after accounting for invoice rows
    const inInvoice = invoiceRows.find((r) => r.productId === p.id)?.qty ?? 0;
    if (p.stock - inInvoice <= 0) return false;

    if (category !== "all") {
      const matches =
        p.category === category ||
        (selectedCat && (p as any).categoryId === selectedCat.id);
      if (!matches) return false;
    }
    if (subcategory !== "all") {
      if (p.subcategory !== subcategory) return false;
    }
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const hit =
        p.name.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q) ||
        (p.barcode ?? "").toLowerCase().includes(q) ||
        (p.brand ?? "").toLowerCase().includes(q) ||
        (p.model ?? "").toLowerCase().includes(q);
      if (!hit) return false;
    }
    return true;
  });

  // ── Click-outside dismiss ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onShowSuggestions]);

  // ── Barcode / Enter key handler ───────────────────────────────────────────
  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        onShowSuggestions(false);
        return;
      }
      if (e.key === "Enter") {
        if (showSuggestions && filteredProducts.length > 0) {
          onAddProduct(filteredProducts[0].id);
          onSearchChange("", false);
        } else {
          const code = (e.target as HTMLInputElement).value.trim();
          if (code) {
            await onBarcodeEnter(code);
            (e.target as HTMLInputElement).value = "";
          }
        }
      }
    },
    [showSuggestions, filteredProducts, onAddProduct, onSearchChange, onBarcodeEnter],
  );

  return (
    <div ref={containerRef} className="flex gap-2 items-start">
      {/* Category */}
      <Select
        value={category}
        onValueChange={(v) => {
          onCategoryChange(v);
          onSubcategoryChange("all");
          onSearchChange("", false);
        }}
      >
        <SelectTrigger className="h-10 w-44 shrink-0 bg-card border-slate-200 text-sm">
          <SelectValue placeholder="Category" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Categories</SelectItem>
          {parentCategories.map((c) => (
            <SelectItem key={c.id} value={c.name}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Subcategory */}
      <Select
        value={subcategory}
        onValueChange={(v) => {
          onSubcategoryChange(v);
          onSearchChange("", v !== "all");
          if (v !== "all") {
            setTimeout(() => searchInputRef.current?.focus(), 80);
          }
        }}
        disabled={category === "all"}
      >
        <SelectTrigger className="h-10 w-44 shrink-0 bg-card border-slate-200 text-sm">
          <SelectValue placeholder="Subcategory" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Subcategories</SelectItem>
          {subcategories.map((c) => (
            <SelectItem key={c.id} value={c.name}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {/* Search / Barcode input + suggestions popover */}
      <div className="relative flex-1">
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          ref={searchInputRef}
          disabled={subcategory === "all"}
          placeholder={
            subcategory === "all"
              ? "Select a subcategory to unlock search…"
              : "Scan barcode or search product…"
          }
          className="pl-9 h-10 bg-card border-slate-200 text-sm"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value, e.target.value.length > 0);
          }}
          onFocus={() => {
            onShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        {/* ── Suggestion dropdown ─────────────────────────────────────────── */}
        {showSuggestions && filteredProducts.length > 0 && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-slate-200 rounded-xl shadow-lg overflow-hidden">
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-50">
              {filteredProducts.slice(0, 12).map((p) => {
                const inInvoice = invoiceRows.find((r) => r.productId === p.id)?.qty ?? 0;
                const available = p.stock - inInvoice;
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-slate-50 transition-colors text-left group"
                    onMouseDown={(e) => {
                      e.preventDefault(); // keep focus in input
                      onAddProduct(p.id);
                      onSearchChange("", false);
                      setTimeout(() => searchInputRef.current?.focus(), 50);
                    }}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-700 truncate">
                        {p.name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {[p.brand, p.model].filter(Boolean).join(" ")} &bull; SKU:{" "}
                        {p.sku}
                      </p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-semibold text-slate-700">
                        {formatCurrency(p.price)}
                      </p>
                      <p
                        className={`text-[10px] font-medium ${
                          available <= 3 ? "text-orange-500" : "text-slate-400"
                        }`}
                      >
                        {available} left
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
            {filteredProducts.length > 12 && (
              <div className="px-4 py-2 bg-slate-50 border-t border-slate-100 text-[11px] text-slate-400">
                +{filteredProducts.length - 12} more — type to narrow down
              </div>
            )}
          </div>
        )}
      </div>

      {/* Camera scan */}
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-10 w-10 shrink-0 border-slate-200"
        onClick={onOpenCamera}
        title="Camera Scan"
      >
        <Camera className="h-4 w-4 text-slate-500" />
      </Button>

      {/* Clear all */}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-10 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 text-xs"
        onClick={onClear}
        disabled={!hasRows}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        Clear
      </Button>
    </div>
  );
}
