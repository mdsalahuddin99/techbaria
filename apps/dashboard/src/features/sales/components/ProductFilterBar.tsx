"use client";

import React, { useRef, useEffect, useCallback, useMemo } from "react";
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
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/shared/hooks/useDebounce";
import { apiFetch } from "@/shared/api-client/fetch";
import { useProductsQuery } from "@/features/products/hooks";

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
  globalBrand?: { name: string } | null;
  globalModel?: { name: string } | null;
  price: number;
  stock: number;
  categoryId?: string;
  category?: string;
  subcategory?: string;
  warehouseStocks?: Array<{ qty: number }>;
}

interface ProductFilterBarProps {
  categories: Category[];
  warehouseId: string | null;
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
  onAddProduct: (product: any, scannedSerial?: string) => void;
  onBarcodeEnter: (code: string) => Promise<void>;
  onClear: () => void;
  onOpenCamera: () => void;

  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function ProductFilterBar({
  categories,
  warehouseId,
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

  const debouncedSearchQuery = useDebounce(searchQuery, 300);

  const { data: productsData } = useProductsQuery();
  const allProducts = productsData?.items || [];

  const searchResults = useMemo(() => {
    let list = allProducts;
    if (category && category !== "all") {
      list = list.filter((p: any) => p.categoryId === selectedCat?.id || p.category?.name === category || p.category === category);
    }
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      list = list.filter((p: any) => {
        const pName = p.name?.toLowerCase() || "";
        const sku = p.sku?.toLowerCase() || "";
        const barcode = p.barcode?.toLowerCase() || "";
        const model = (p.globalModel?.name || p.model)?.toLowerCase() || "";
        const brand = (p.globalBrand?.name || p.brand)?.toLowerCase() || "";
        const tagsMatches = Array.isArray(p.searchTags) 
          ? p.searchTags.some((tag: string) => tag.toLowerCase().includes(q))
          : false;
          
        return pName.includes(q) || sku.includes(q) || barcode === q || model.includes(q) || brand.includes(q) || tagsMatches;
      });
    }
    return list.slice(0, 50);
  }, [allProducts, category, selectedCat?.id, debouncedSearchQuery]);

  const isLoading = false;

  const filteredProducts = useMemo(() => {
    return (searchResults || []).filter((p) => {
      // Exclude products where available qty would be 0 after accounting for invoice rows
      const inInvoice = invoiceRows.find((r) => r.productId === p.id)?.qty ?? 0;
      
      let availableStock = Number(p.stock ?? 0);
      if (warehouseId && p.warehouseStocks) {
        const wStock = p.warehouseStocks.find((ws: any) => ws.warehouseId === warehouseId);
        // Fallback to global stock if no warehouse-specific record exists yet
        // (e.g. product was just purchased and cache hasn't refreshed)
        availableStock = wStock ? Number(wStock.qty ?? 0) : Number(p.stock ?? 0);
      }
      // Note: if warehouseId is set but warehouseStocks is undefined (stale cache),
      // we keep the global stock so the product remains searchable.

      if (availableStock - inInvoice <= 0) return false;
      return true;
    });
  }, [searchResults, invoiceRows, warehouseId]);

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

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Escape") {
        onShowSuggestions(false);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const query = searchQuery.trim().toLowerCase();
        const firstProduct = filteredProducts[0];
        const tagsMatches = firstProduct && Array.isArray(firstProduct.searchTags) 
          ? firstProduct.searchTags.some((tag: string) => tag.toLowerCase().includes(query))
          : false;
          
        const isRelevant = firstProduct && query && (
          firstProduct.name?.toLowerCase().includes(query) ||
          firstProduct.sku?.toLowerCase().includes(query) ||
          firstProduct.barcode?.toLowerCase().includes(query) ||
          tagsMatches
        );

        if (showSuggestions && filteredProducts.length > 0 && isRelevant) {
          onAddProduct(filteredProducts[0]);
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
    [showSuggestions, filteredProducts, onAddProduct, onSearchChange, onBarcodeEnter, searchQuery],
  );

  return (
    <div ref={containerRef} className="flex gap-2 items-start">


      {/* Search / Barcode input + suggestions popover */}
      <div className="relative flex-1">
        <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        <Input
          ref={searchInputRef}
          placeholder="Scan barcode or search product by name, brand, SKU…"
          className="pl-9 h-10 bg-card border-border rounded-[4px] text-sm"
          value={searchQuery}
          onChange={(e) => {
            onSearchChange(e.target.value, true);
          }}
          onFocus={() => {
            onShowSuggestions(true);
          }}
          onKeyDown={handleKeyDown}
          autoComplete="off"
        />

        {/* ── Suggestion dropdown ─────────────────────────────────────────── */}
        {showSuggestions && (
          <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-card border border-border rounded-[4px] overflow-hidden shadow-md">
            {filteredProducts.length > 0 ? (
              <div className="max-h-64 overflow-y-auto divide-y divide-border">
                {filteredProducts.slice(0, 12).map((p) => {
                  const inInvoice = invoiceRows.find((r) => r.productId === p.id)?.qty ?? 0;
                  
                  let availableStock = Number(p.stock ?? 0);
                  if (warehouseId && p.warehouseStocks) {
                    const wStock = p.warehouseStocks.find((ws: any) => ws.warehouseId === warehouseId);
                    // Fallback to global stock if no warehouse-specific record found
                    availableStock = wStock ? Number(wStock.qty ?? 0) : Number(p.stock ?? 0);
                  }

                  const available = availableStock - inInvoice;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-secondary/20 transition-colors text-left group"
                      onMouseDown={(e) => {
                        e.preventDefault(); // keep focus in input
                        onAddProduct(p);
                        onSearchChange("", false);
                        setTimeout(() => searchInputRef.current?.focus(), 50);
                      }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {p.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {[
                            p.globalBrand?.name,
                            p.globalModel?.name,
                            typeof p.brand === "object" && p.brand ? (p.brand as any).name : p.brand,
                            typeof p.model === "object" && p.model ? (p.model as any).name : p.model,
                          ]
                            .filter(Boolean)
                            .join(" ")}{" "}
                          &bull; SKU: {p.sku}
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
            ) : searchQuery ? (
              <div className="px-4 py-3 text-center text-xs text-slate-400 font-medium">
                🔍 No matching products found with stock in this warehouse
              </div>
            ) : null}
            {filteredProducts.length > 12 && (
              <div className="px-4 py-2 bg-secondary/15 border-t border-border text-[11px] text-slate-500">
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
        className="h-10 w-10 shrink-0 border-border rounded-[4px]"
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
        className="h-10 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-[4px] shrink-0 text-xs"
        onClick={onClear}
        disabled={!hasRows}
      >
        <Trash2 className="h-3.5 w-3.5 mr-1" />
        Clear
      </Button>
    </div>
  );
}
