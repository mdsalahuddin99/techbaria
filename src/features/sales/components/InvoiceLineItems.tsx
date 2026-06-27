"use client";

import React from "react";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/ui/select";
import { Plus, Minus, X, Receipt, Eye } from "lucide-react";
import { formatCurrency } from "@/shared/lib/format";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";

export interface VoucherRow {
  id: string;
  productId: string;
  name: string;
  qty: number;
  price: number;
  discount?: number;
  serials: string[];
  warrantyMonths?: number;
  originalProduct?: any;
}

interface Product {
  id: string;
  name: string;
  trackSerials?: boolean;
  stock: number;
  cost?: number | string | any;
  serials?: Array<{ serialNumber?: string; imei?: string; [k: string]: any }>;
  serialNumbers?: Array<{ serial?: string; [k: string]: any }>;
  warrantyMonths?: number;
}

function getAllProductSerials(p: Product): string[] {
  const rawSerials = (p as any)?.serials ?? [];
  const rawSerialNumbers = (p as any)?.serialNumbers ?? [];
  return rawSerials.length > 0
    ? rawSerials.map((s: any) => s.serialNumber ?? s.serial ?? s).filter(Boolean)
    : rawSerialNumbers.map((s: any) => s.serial ?? s).filter(Boolean);
}

function calculateRemaining(expiryDateStr: string): string {
  const end = new Date(expiryDateStr);
  const now = new Date();
  if (now > end) return "Expired";
  
  const diffTime = end.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays > 30) {
    const months = Math.floor(diffDays / 30);
    const days = diffDays % 30;
    return `${months}m ${days}d`;
  }
  return `${diffDays}d`;
}

function getRemainingWarranty(product: Product | undefined, rowSerials: string[]): string {
  if (!product) return "Unknown";
  // If serial tracked, find the first selected serial's expiry date
  if (product.trackSerials && rowSerials.length > 0) {
    const s = rowSerials[0];
    const serialObj = (product as any).serials?.find((x: any) => x.serialNumber === s || x.imei === s || x.serial === s) ||
                      (product as any).serialNumbers?.find((x: any) => x.serial === s);
    
    if (serialObj) {
      if (serialObj.warrantyExpiryDate) {
        return calculateRemaining(serialObj.warrantyExpiryDate);
      }
      if (serialObj.warrantyStartDate && serialObj.warrantyMonths) {
        const start = new Date(serialObj.warrantyStartDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + serialObj.warrantyMonths);
        return calculateRemaining(end.toISOString());
      }
      if (serialObj.createdAt && serialObj.warrantyMonths) {
        const start = new Date(serialObj.createdAt);
        const end = new Date(start);
        end.setMonth(end.getMonth() + serialObj.warrantyMonths);
        return calculateRemaining(end.toISOString());
      }
      if (serialObj.createdAt && product.warrantyMonths) {
        const start = new Date(serialObj.createdAt);
        const end = new Date(start);
        end.setMonth(end.getMonth() + product.warrantyMonths);
        return calculateRemaining(end.toISOString());
      }
    }
  }

  // Fallback to product level
  let productWarrantyMonths = product.warrantyMonths ?? 0;
  let warrantyStartDate = (product as any).warrantyStartDate ? new Date((product as any).warrantyStartDate) : null;

  if (!productWarrantyMonths && (product as any).serials && (product as any).serials.length > 0) {
    const unitWithWarranty = (product as any).serials.find((s: any) => s.warrantyMonths && s.warrantyMonths > 0);
    if (unitWithWarranty) {
      productWarrantyMonths = unitWithWarranty.warrantyMonths;
      warrantyStartDate = unitWithWarranty.warrantyStartDate ? new Date(unitWithWarranty.warrantyStartDate) : (unitWithWarranty.createdAt ? new Date(unitWithWarranty.createdAt) : null);
    }
  }

  if (productWarrantyMonths > 0) {
    if (warrantyStartDate) {
      const end = new Date(warrantyStartDate);
      end.setMonth(end.getMonth() + productWarrantyMonths);
      return calculateRemaining(end.toISOString());
    } else if ((product as any).createdAt) {
      const end = new Date((product as any).createdAt);
      end.setMonth(end.getMonth() + productWarrantyMonths);
      return calculateRemaining(end.toISOString());
    }
    return `${productWarrantyMonths}m`;
  }

  return "No Warranty";
}

interface InvoiceLineItemsProps {
  rows: VoucherRow[];
  onChangeQty: (rowId: string, qty: number) => void;
  onChangeSerials: (rowId: string, serials: string[]) => void;
  onChangeWarranty: (rowId: string, months: number) => void;
  onChangeDiscount?: (rowId: string, discount: number) => void;
  onRemoveRow: (rowId: string) => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
}

export function InvoiceLineItems({
  rows,
  onChangeQty,
  onChangeSerials,
  onChangeWarranty,
  onChangeDiscount,
  onRemoveRow,
  searchInputRef,
}: InvoiceLineItemsProps) {
  if (rows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 rounded-[4px] border-2 border-dashed border-border bg-secondary/15 text-slate-400">
        <Receipt className="h-12 w-12 mb-3 opacity-20" />
        <p className="text-sm font-medium text-slate-500">No items added yet</p>
        <p className="text-xs mt-1">
          Select a subcategory then search or scan a barcode to add products
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-[4px] border border-border overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-secondary/40 border-b border-border">
            <th className="text-left px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-8">
              #
            </th>
            <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Product
            </th>
            <th className="text-left px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-20">
              Warranty
            </th>
            <th className="text-center px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-36">
              Qty
            </th>
            <th className="text-right px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-24">
              Discount
            </th>
            <th className="text-right px-3 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-28">
              Unit Price
            </th>
            <th className="text-right px-4 py-3 text-[11px] font-bold uppercase tracking-wider text-slate-500 w-28">
              Total
            </th>
            <th className="w-20" />
          </tr>
        </thead>
        <tbody className="divide-y divide-border bg-card">
          {rows.map((row, idx) => {
            const product = row.originalProduct;
            const isTracked = product?.trackSerials ?? true;
            
            // Calculate effective stock by taking original stock and subtracting other rows with same product
            const qtyInOtherRows = rows
              .filter(r => r.productId === row.productId && r.id !== row.id)
              .reduce((sum, r) => sum + r.qty, 0);
            const stock = product ? (product.stock ?? 0) - qtyInOtherRows : 9999;
            
            const allSerials = product ? getAllProductSerials(product) : [];
            const defaultWarranty = product?.warrantyMonths ?? (product as any)?.serials?.find((s: any) => s.warrantyMonths && s.warrantyMonths > 0)?.warrantyMonths ?? 0;

            return (
              <tr key={row.id} className="hover:bg-secondary/15 transition-colors">
                {/* Row number */}
                <td className="px-4 py-3 text-xs text-slate-400 font-medium">
                  {idx + 1}
                </td>

                {/* Product name & serials */}
                <td className="px-3 py-3">
                  <p className="font-medium text-slate-700 text-[13px] leading-tight">
                    {row.name}
                  </p>

                  {isTracked && (
                    <div className="mt-1.5">
                      <div className="flex flex-wrap gap-1">
                        {row.serials.map((serial, i) => (
                          <span
                            key={i}
                            className="inline-flex items-center gap-1 bg-secondary/25 text-slate-800 text-[10px] font-semibold pl-1.5 pr-1 py-0.5 rounded-[4px] border border-border"
                          >
                            {serial}
                            <button
                              type="button"
                              onClick={() => {
                                const newSerials = row.serials.filter((_, idx) => idx !== i);
                                onChangeSerials(row.id, newSerials);
                                if (row.qty <= 1) {
                                  onRemoveRow(row.id);
                                } else {
                                  onChangeQty(row.id, row.qty - 1);
                                }
                              }}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </td>

                {/* Warranty months */}
                <td className="px-3 py-3">
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={row.warrantyMonths ?? 0}
                    onChange={(e) => {
                      const val = parseInt(e.target.value);
                      onChangeWarranty(row.id, isNaN(val) ? 0 : val);
                    }}
                    className="w-12 h-7 text-xs border-border bg-card rounded-[4px] text-center px-1 shrink-0"
                    title="Customer Warranty (Months)"
                  />
                </td>

                {/* Qty stepper */}
                <td className="px-3 py-3">
                  <div className="flex items-center justify-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 border border-border hover:border-border/85 rounded-[4px]"
                      onClick={() => {
                        if (row.qty <= 1) onRemoveRow(row.id);
                        else onChangeQty(row.id, row.qty - 1);
                      }}
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <Input
                      type="number"
                      value={row.qty}
                      min={1}
                      max={stock}
                      className="w-14 text-center h-7 text-sm border-border bg-card rounded-[4px] px-1"
                      onChange={(e) => {
                        const qty = Math.max(1, parseInt(e.target.value) || 1);
                        if (qty > stock) {
                          toast.error(
                            `Only ${stock} units available for "${product?.name ?? "this product"}"`,
                          );
                          return;
                        }
                        if (isTracked && qty > row.qty) {
                          const diff = qty - row.qty;
                          const available = allSerials.filter((s) => !row.serials.includes(s));
                          const toAdd = available.slice(0, diff);
                          if (toAdd.length > 0) {
                            onChangeSerials(row.id, [...row.serials, ...toAdd]);
                          }
                        }
                        onChangeQty(row.id, qty);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") searchInputRef.current?.focus();
                      }}
                    />
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 border border-border hover:border-border/85 rounded-[4px]"
                      onClick={() => {
                        if (row.qty + 1 > stock) {
                          toast.error(
                            `Only ${stock} units available for "${product?.name ?? "this product"}"`,
                          );
                          return;
                        }
                        if (isTracked) {
                          const available = allSerials.filter((s) => !row.serials.includes(s));
                          if (available.length > 0) {
                            onChangeSerials(row.id, [...row.serials, available[0]]);
                          }
                        }
                        onChangeQty(row.id, row.qty + 1);
                      }}
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                  </div>
                </td>

                {/* Discount */}
                <td className="px-3 py-3">
                  <Input
                    name="row-discount"
                    type="number"
                    min={0}
                    value={row.discount === 0 || !row.discount ? "" : row.discount}
                    onChange={(e) => {
                      const val = parseFloat(e.target.value);
                      onChangeDiscount?.(row.id, isNaN(val) ? 0 : val);
                    }}
                    placeholder="0.00"
                    className="w-20 h-7 text-xs border-border bg-card rounded-[4px] text-right px-2"
                  />
                </td>

                {/* Unit price */}
                <td className="px-3 py-3 text-right">
                  <span className="text-sm text-slate-700 tabular-nums">
                    {formatCurrency(row.price)}
                  </span>
                </td>

                {/* Line total */}
                <td className="px-4 py-3 text-right">
                  <span className="font-semibold text-slate-700 tabular-nums">
                    {formatCurrency(row.price * row.qty - (row.discount || 0))}
                  </span>
                </td>

                {/* Action column (Quick-View & Delete) */}
                <td className="px-2 py-3 text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="h-7 w-7 rounded-[4px] grid place-items-center text-slate-400 hover:text-primary hover:bg-primary/10 transition-colors"
                          title="Quick View Margin"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-56 p-3 bg-card border border-border rounded-[4px] shadow-none z-50">
                        <div className="space-y-2 text-xs">
                          <p className="font-bold text-slate-700 border-b border-border pb-1">Cost & Margin Info</p>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Sell Price:</span>
                            <span className="font-medium text-slate-800">{formatCurrency(row.price)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Purchase Cost:</span>
                            <span className="font-medium text-slate-800">{formatCurrency(Number(product?.cost ?? 0))}</span>
                          </div>
                          <div className="flex justify-between border-t border-border pt-1.5 font-semibold">
                            <span className="text-slate-700">Margin:</span>
                            <span className={Number(product?.cost ?? 0) <= row.price ? "text-emerald-600" : "text-destructive"}>
                              {formatCurrency(row.price - Number(product?.cost ?? 0))}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Margin %:</span>
                            <span className={Number(product?.cost ?? 0) <= row.price ? "text-emerald-600 font-medium" : "text-destructive font-medium"}>
                              {row.price > 0 ? (((row.price - Number(product?.cost ?? 0)) / row.price) * 100).toFixed(1) + "%" : "0%"}
                            </span>
                          </div>
                          <div className="flex justify-between border-t border-border pt-1.5">
                            <span className="text-slate-500">Vendor Warranty:</span>
                            {(() => {
                              const remaining = getRemainingWarranty(product, row.serials);
                              if (remaining === "No Warranty" || remaining === "Unknown") {
                                return <span className="font-medium text-slate-600">No Warranty</span>;
                              }
                              const isExpired = remaining === "Expired";
                              return (
                                <span className={`font-semibold ${isExpired ? "text-destructive" : "text-emerald-600"}`}>
                                  {isExpired ? "Expired" : `${remaining} left`}
                                </span>
                              );
                            })()}
                          </div>
                        </div>
                      </PopoverContent>
                    </Popover>

                    <button
                      type="button"
                      onClick={() => onRemoveRow(row.id)}
                      className="h-7 w-7 rounded-[4px] grid place-items-center text-slate-400 hover:text-destructive hover:bg-destructive/10 transition-colors"
                      title="Remove item"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
