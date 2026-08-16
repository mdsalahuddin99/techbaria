"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { useAuth } from "@/features/auth/AuthProvider";

import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { toast } from "sonner";
import { formatCurrency, productDisplayName, round2 } from "@/shared/lib/format";
import type { Sale, PaymentMethod, SalePayment } from "@/shared/lib/types";
import CameraScanner from "@/components/CameraScanner";
import {
  type ReceiptView,
  type HeldSaleForPrint,
  InvoiceHeader,
  ProductFilterBar,
  InvoiceLineItems,
} from "@/features/sales/components";

const InvoicePreview = dynamic(() => import("@/features/sales/components").then(mod => mod.InvoicePreview), { ssr: false });
const DraftInvoicePreview = dynamic(() => import("@/features/sales/components").then(mod => mod.DraftInvoicePreview), { ssr: false });
const PaymentCollector = dynamic(() => import("@/features/sales/components").then(mod => mod.PaymentCollector), { ssr: false });
const CustomerSidebar = dynamic(() => import("@/features/sales/components").then(mod => mod.CustomerSidebar), { ssr: false });

import type { VoucherRow } from "@/features/sales/components";
import { usePosCoreData, posInitKeys } from "@/features/pos";
import { customersApi } from "@/shared/api-client/customers";
import { salesApi } from "@/shared/api-client/sales";
import { apiFetch } from "@/shared/api-client/fetch";
import { saleCreateSchema } from "@/shared/validators/sale";
import { CheckCircle2, Printer, Plus, Pause, Trash2, Receipt, Search, FileText, Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import { Input } from "@/shared/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { useAccountsByType } from "@/features/accounts/hooks";
import { useCreateSale } from './useCreateSale';



// ─── Page ─────────────────────────────────────────────────────────────────────

export function CreateSaleClient() {
  const {
    searchParams, router, queryClient, editingSaleId, cashAccounts, session,
    selectedWarehouseId, setSelectedWarehouseId, warehouses, categories, users, settings, isLoading,
    voucherRows, setVoucherRows, voucherCustomerId, setVoucherCustomerId,
    voucherCategory, setVoucherCategory, voucherSubcategory, setVoucherSubcategory,
    voucherSearchQuery, setVoucherSearchQuery, showSuggestions, setShowSuggestions,
    payments, setPayments, walletAutoApplied, setWalletAutoApplied,
    receipt, setReceipt, receiptView, setReceiptView,
    cameraOpen, setCameraOpen, cameraScans, setCameraScans,
    isCheckingOut, setIsCheckingOut, saleLoading, setSaleLoading,
    salesPerson, setSalesPerson, destination, setDestination,
    attention, setAttention, invoiceDate, setInvoiceDate,
    narration, setNarration, quickName, setQuickName,
    quickPhone, setQuickPhone, heldOpen, setHeldOpen,
    draftPreview, setDraftPreview, vSearchRef, voucherRowRefs,
    heldSales, refetchHeldSales, currentCustomer, customers,
    loadDraftId, subtotal, invoiceTotal, addProductToVoucher,
    handleBarcodeEnter, changeQty, changeSerials, changeWarranty,
    changePrice, changeDiscount, removeRow, clearVoucher, holdCurrentSale,
    resumeHeldSale, deleteHeldSale, handleCheckout, handleCameraBarcode,
    pendingMethod, setPendingMethod,
    pendingAmount, setPendingAmount,
    pendingAccountId, setPendingAccountId,
    exchangeSaleId, exchangeOriginalSale, totalReturn,
    returnQtys, restock, handleReturnChange, handleRestockChange,
    exchangeReason, setExchangeReason, refundMethod, setRefundMethod
  } = useCreateSale();

  return (
    <div className="w-full max-w-[1600px] mx-auto p-0 flex flex-col min-h-[calc(100vh-100px)] gap-2">
      {/* ── Standard POS Header ── */}
      <div className="border border-border bg-card px-2 py-1.5">
        <div className="flex flex-col gap-1.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Side: Title & Info */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {exchangeOriginalSale 
                ? `Process Exchange (Inv #${exchangeOriginalSale.invoiceNo})` 
                : editingSaleId 
                  ? "Edit Sale Invoice" 
                  : "New Sale Invoice"}
            </h1>
            <div className="hidden sm:flex items-center gap-2 border-l pl-3 border-slate-200">
              <span className="inline-flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse" />
                POS Active
              </span>
              <span className="text-[11px] text-slate-500 font-medium">
                {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>

          {/* Right Side: Actions & Search */}
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
            <div className="flex items-center gap-1.5 sm:gap-2 w-full justify-start overflow-x-auto pb-1 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard/sales")}
                className="h-8 sm:h-9 px-2.5 sm:px-3 border-slate-200 bg-white text-[10px] sm:text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-sm transition-colors whitespace-nowrap shrink-0"
              >
                <Search className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-slate-400" />
                Invoice Search
              </Button>

              <Popover open={heldOpen} onOpenChange={setHeldOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="h-8 sm:h-9 px-2.5 sm:px-3 border-slate-200 bg-white text-[10px] sm:text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 relative flex items-center gap-1.5 shadow-sm transition-colors whitespace-nowrap shrink-0"
                  >
                    <FileText className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-slate-400" />
                    Quotations
                    {heldSales.length > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] h-4 w-4 flex items-center justify-center rounded-full font-bold shadow-sm">
                        {heldSales.length}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-96 p-0 z-50 max-w-[calc(100vw-1rem)]">
                  <div className="px-3 py-2.5 border-b bg-muted/40">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Quotations</h3>
                  </div>
                  {heldSales.length === 0 ? (
                    <div className="p-6 text-center">
                      <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                      <p className="text-sm text-muted-foreground">No quotations found</p>
                      <p className="text-[11px] text-muted-foreground/60 mt-1">Save a quotation to view it here</p>
                    </div>
                  ) : (
                    <ul className="max-h-80 overflow-y-auto divide-y divide-border">
                      {heldSales.map((h: any) => {
                        const cartItems = (h.cart || []).filter((i: any) => !i._meta);
                        const draftTotal = round2(
                          cartItems.reduce((s: number, i: any) => s + i.price * i.qty - (i.discount || 0), 0)
                        );
                        const itemCount = cartItems.reduce((s: number, i: any) => s + i.qty, 0);
                        const heldDate = new Date(h.heldAt);
                        return (
                          <li key={h.id} className="p-2.5 hover:bg-secondary/50 transition-colors">
                            <div className="flex items-start gap-2">
                              <button
                                type="button"
                                className="flex-1 min-w-0 text-left"
                                onClick={() => resumeHeldSale(h.id)}
                                title="Resume this quotation"
                              >
                                <p className="text-sm font-semibold truncate text-slate-800">
                                  {h.customerName || h.customer?.name || "No Customer"}
                                </p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-xs font-bold text-primary tabular-nums">
                                    {formatCurrency(draftTotal)}
                                  </span>
                                  <span className="text-[10px] text-muted-foreground">·</span>
                                  <span className="text-[11px] text-muted-foreground">
                                    {itemCount} item{itemCount !== 1 ? "s" : ""}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 mt-1">
                                  <Clock className="h-3 w-3 text-muted-foreground/60" />
                                  <span className="text-[10px] text-muted-foreground">
                                    {heldDate.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })}{" "}
                                    {heldDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: true })}
                                  </span>
                                </div>
                              </button>
                              <div className="flex items-center gap-1 shrink-0">
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-slate-500 hover:text-primary"
                                  onClick={() => {
                                    setDraftPreview(h);
                                    setHeldOpen(false);
                                  }}
                                  title="Print Quotation"
                                >
                                  <Printer className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-8 w-8 text-destructive/70 hover:text-destructive"
                                  onClick={() => window.confirm("Are you sure you want to delete this draft?") && deleteHeldSale(h.id)}
                                  title="Discard"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </PopoverContent>
              </Popover>

              {voucherRows.length > 0 && (
                <Button
                  variant="ghost"
                  onClick={clearVoucher}
                  className="h-8 sm:h-9 px-2.5 sm:px-3 text-[10px] sm:text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                >
                  <Trash2 className="h-3 sm:h-3.5 w-3 sm:w-3.5" />
                  Clear Cart
                </Button>
              )}
            </div>


          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-2 flex-1">
        {/* Tier 1: Left Sidebar */}
        <div className="w-full lg:w-72 shrink-0">
          <CustomerSidebar
            customers={[]}
            customerId={voucherCustomerId}
            onCustomerChange={setVoucherCustomerId}
          />
        </div>

        {/* Right Content Column */}
        <div className="flex-1 flex flex-col space-y-2 min-w-0 relative">
          {/* Invoice card */}
          <div className="bg-card border border-border p-2 space-y-2">
            <div className="flex flex-col md:flex-row md:items-end gap-2">
              {warehouses?.length > 1 && (
                <div className="w-full md:w-64 shrink-0">
                  <InvoiceHeader
                    warehouses={warehouses}
                    selectedWarehouseId={selectedWarehouseId}
                    onWarehouseChange={(id) => {
                      setSelectedWarehouseId(id);
                      clearVoucher();
                    }}
                    editMode={!!editingSaleId}
                  />
                </div>
              )}

              <div className="flex-1 min-w-0">
                {!selectedWarehouseId ? (
                  <div className="flex h-9 sm:h-10 items-center justify-center text-sm text-slate-400 border border-dashed rounded-[4px]">
                    {isLoading ? "Loading POS data..." : "Select warehouse first"}
                  </div>
                ) : (
                  <ProductFilterBar
                    categories={categories}
                    warehouseId={selectedWarehouseId}
                    invoiceRows={voucherRows}
                    category={voucherCategory}
                    subcategory={voucherSubcategory}
                    searchQuery={voucherSearchQuery}
                    showSuggestions={showSuggestions}
                    hasRows={voucherRows.length > 0}
                    onCategoryChange={setVoucherCategory}
                    onSubcategoryChange={setVoucherSubcategory}
                    onSearchChange={(v, show) => {
                      setVoucherSearchQuery(v);
                      setShowSuggestions(show);
                    }}
                    onShowSuggestions={setShowSuggestions}
                    onAddProduct={addProductToVoucher}
                    onBarcodeEnter={handleBarcodeEnter}
                    onClear={clearVoucher}
                    onOpenCamera={() => setCameraOpen(true)}
                    searchInputRef={vSearchRef}
                  />
                )}
              </div>
            </div>

            {selectedWarehouseId && (
              <>
                <div className="border-t border-border" />

                {exchangeOriginalSale && (
                  <div className="space-y-2 mb-4 bg-red-50/50 p-2 rounded-lg border border-red-100">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-700 mb-2">
                      1. Return Items (Invoice #{exchangeOriginalSale.invoiceNo})
                    </h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-red-200 text-red-600">
                            <th className="pb-1 font-semibold">Item</th>
                            <th className="pb-1 font-semibold text-right">Price</th>
                            <th className="pb-1 font-semibold text-center w-24">Return Qty</th>
                            <th className="pb-1 font-semibold text-center w-16">Restock</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-red-100/50">
                          {exchangeOriginalSale.items.map((item) => (
                            <tr key={item.productId}>
                              <td className="py-1.5">
                                <div className="font-medium text-slate-800">{item.name}</div>
                                <div className="text-[10px] text-slate-500">Purchased: {item.qty}</div>
                              </td>
                              <td className="py-1.5 text-right font-medium tabular-nums text-slate-700">
                                {formatCurrency(item.price)}
                              </td>
                              <td className="py-1.5 text-center">
                                <Input
                                  type="number"
                                  min="0"
                                  max={item.qty}
                                  value={returnQtys[item.productId] || ""}
                                  onChange={(e) => handleReturnChange(item.productId, parseInt(e.target.value) || 0)}
                                  className="h-7 text-xs w-16 mx-auto text-center"
                                />
                              </td>
                              <td className="py-1.5 text-center">
                                <input
                                  type="checkbox"
                                  checked={restock[item.productId] !== false}
                                  onChange={(e) => handleRestockChange(item.productId, e.target.checked)}
                                  disabled={!(returnQtys[item.productId] > 0)}
                                  className="rounded border-gray-300 text-red-600 focus:ring-red-500"
                                />
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <div className="flex justify-end pt-1 pr-1">
                      <div className="text-xs font-bold text-red-700">
                        Total Return Value: {formatCurrency(totalReturn)}
                      </div>
                    </div>
                  </div>
                )}

                {/* Line items table */}
                <div className="space-y-1">
                  {exchangeOriginalSale && (
                    <h3 className="text-xs font-bold uppercase tracking-wider text-emerald-700 mb-2 pl-2">
                      2. New Items to Issue
                    </h3>
                  )}
                  {/* Line items table */}
                  <InvoiceLineItems
                    rows={voucherRows}
                    onChangeQty={changeQty}
                    onChangeSerials={changeSerials}
                    onChangeWarranty={changeWarranty}
                    onChangeDiscount={changeDiscount}
                    onChangePrice={changePrice}
                    onRemoveRow={removeRow}
                    searchInputRef={vSearchRef}
                  />

                  {/* Invoice subtotal summary (above payment) */}
                  {voucherRows.length > 0 && (
                    <div className="flex justify-end pr-1">
                      <div className="text-xs text-slate-500 font-medium">
                        {voucherRows.length} item{voucherRows.length !== 1 ? "s" : ""} ·{" "}
                        Subtotal:{" "}
                        <span className="font-extrabold text-slate-800 tabular-nums">
                          {formatCurrency(subtotal)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Bottom Section: Payment & Details (only when there are items in the cart) */}
          {voucherRows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-2">
              {/* Left Sub-column: Additional Details */}
              <div className="lg:col-span-4 space-y-2">
                <div className="bg-card border border-border p-2 space-y-2">
                  <h3 className="text-[10px] font-bold uppercase tracking-wider text-slate-700 border-b border-border pb-1">
                    Additional Details
                  </h3>
                  <div className="space-y-1.5">
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Sales Person
                        </label>
                        <Select
                          value={salesPerson || "none"}
                          onValueChange={(val) => setSalesPerson(val === "none" ? "" : val)}
                        >
                          <SelectTrigger className="h-8 text-xs border-border bg-card rounded-[4px]">
                            <SelectValue placeholder="Select sales person..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">-- Select --</SelectItem>
                            {settings?.salesPersons?.map((name: string) => (
                              <SelectItem key={name} value={name}>
                                {name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Invoice Date
                        </label>
                        <Input
                          type="date"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className="h-8 text-xs border-border bg-card rounded-[4px]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Destination
                        </label>
                        <Input
                          type="text"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          placeholder="Destination…"
                          className="h-8 text-xs border-border bg-card rounded-[4px]"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                          Attention
                        </label>
                        <Input
                          type="text"
                          value={attention}
                          onChange={(e) => setAttention(e.target.value)}
                          placeholder="Attention…"
                          className="h-8 text-xs border-border bg-card rounded-[4px]"
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </div>

              {/* Right Sub-column: Payment Collector */}
              <div className="lg:col-span-8 space-y-2">
                {exchangeOriginalSale && invoiceTotal < 0 ? (
                  <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl h-full flex flex-col justify-center">
                    <h3 className="font-bold text-amber-800 mb-2">Customer Refund Required</h3>
                    <p className="text-sm text-amber-700 mb-4">
                      The return value is greater than the new items. You need to refund 
                      <span className="font-bold ml-1">{formatCurrency(Math.abs(invoiceTotal))}</span>.
                    </p>
                    <div className="space-y-1 w-full max-w-sm">
                      <label className="text-xs font-bold uppercase text-slate-500">Refund Method</label>
                      <Select value={refundMethod} onValueChange={setRefundMethod}>
                        <SelectTrigger className="bg-white">
                          <SelectValue placeholder="Select refund method..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Cash">Cash</SelectItem>
                          <SelectItem value="Bank">Bank / Card</SelectItem>
                          {voucherCustomerId && <SelectItem value="Wallet">Customer Wallet</SelectItem>}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <PaymentCollector
                    subtotal={invoiceTotal}
                  payments={payments}
                  onAddPayment={(p) => setPayments((prev) => [...prev, p])}
                  onRemovePayment={(idx) => {
                    const removed = payments[idx];
                    if (removed?.method === "Wallet") {
                      setWalletAutoApplied(false);
                    }
                    setPayments((prev) => prev.filter((_, i) => i !== idx));
                  }}
                  customerId={voucherCustomerId}
                  customers={customers}
                  quickName={quickName}
                  quickPhone={quickPhone}
                  onQuickNameChange={setQuickName}
                  onQuickPhoneChange={setQuickPhone}
                  pendingMethod={pendingMethod}
                  setPendingMethod={setPendingMethod}
                  pendingAmount={pendingAmount}
                  setPendingAmount={setPendingAmount}
                  pendingAccountId={pendingAccountId}
                  setPendingAccountId={setPendingAccountId}
                />
                )}

                {exchangeOriginalSale && (
                  <div className="bg-card border border-border p-3 space-y-2 mt-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                      Reason for Exchange <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="text"
                      value={exchangeReason}
                      onChange={(e) => setExchangeReason(e.target.value)}
                      placeholder="e.g. Defective, Wrong Size, Changed Mind..."
                      className="text-sm border-border bg-card rounded-[4px]"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Checkout & Action Buttons (Sticky at bottom of viewport) */}
          {voucherRows.length > 0 && (
            <div className="sticky bottom-0 mt-auto bg-card border-t border-border p-2 flex flex-nowrap sm:flex-wrap items-center justify-between gap-1.5 sm:gap-2 z-30">
              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto flex-1 sm:flex-none">
                <Button
                  variant="outline"
                  className="border-border text-slate-600 h-8 sm:h-10 rounded-[4px] font-semibold hover:bg-secondary text-[10px] sm:text-xs px-2 sm:px-4 flex-1 sm:flex-none"
                  onClick={() => router.push("/dashboard/sales")}
                >
                  Cancel
                </Button>

                {voucherRows.length > 0 && !editingSaleId && (
                  <Button variant="outline" className="border-border text-slate-600 h-8 sm:h-10 rounded-[4px] font-semibold hover:bg-secondary text-[10px] sm:text-xs px-2 sm:px-4 flex-1 sm:flex-none whitespace-nowrap" onClick={holdCurrentSale}>
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">Save</span> Quotation
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto flex-1 sm:flex-none">
                {receipt && (
                  <>
                    <Button
                      variant="outline"
                      className="border-border h-8 sm:h-10 text-[10px] sm:text-xs rounded-[4px] font-semibold hover:bg-secondary px-2 sm:px-4 flex-1 sm:flex-none"
                      onClick={() => setReceiptView("thermal")}
                    >
                      <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" /> Thermal
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border h-8 sm:h-10 text-[10px] sm:text-xs rounded-[4px] font-semibold hover:bg-secondary px-2 sm:px-4 flex-1 sm:flex-none"
                      onClick={() => setReceiptView("invoice")}
                    >
                      <Printer className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" /> A4
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border h-8 sm:h-10 text-[10px] sm:text-xs rounded-[4px] font-semibold hover:bg-secondary px-2 sm:px-4 flex-1 sm:flex-none"
                      onClick={() => {
                        clearVoucher();
                        setReceipt(null);
                        setReceiptView(null);
                      }}
                    >
                      <Plus className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5" /> <span className="hidden sm:inline">New Invoice</span>
                    </Button>
                  </>
                )}
                <LoadingButton
                  loading={isCheckingOut || saleLoading}
                  disabled={voucherRows.length === 0 || !selectedWarehouseId}
                  className="h-8 sm:h-10 bg-primary text-primary-foreground shadow-none hover:bg-primary/95 min-w-0 sm:min-w-32 rounded-[4px] font-bold text-[10px] sm:text-xs px-2 sm:px-4 flex-1 sm:flex-none whitespace-nowrap"
                  onClick={handleCheckout}
                >
                  <CheckCircle2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-1.5 hidden sm:inline" />
                  {editingSaleId ? "Update" : "Save Invoice"}
                </LoadingButton>
              </div>
            </div>
          )}
        </div>

      {/* Camera barcode scanner */}
      <CameraScanner
        open={cameraOpen}
        onClose={() => setCameraOpen(false)}
        onDetected={handleCameraBarcode}
        scanCount={cameraScans}
        addedCount={cameraScans}
      />

      {/* Invoice preview / print */}
      {receipt && receiptView && (
        <InvoicePreview
          sale={receipt}
          settings={settings}
          view={receiptView}
          onClose={() => setReceiptView(null)}
          onPickThermal={() => setReceiptView("thermal")}
          onPickInvoice={() => setReceiptView("invoice")}
        />
      )}
      {/* Draft Invoice Quotation Preview/Print */}
      <DraftInvoicePreview
        draft={draftPreview}
        settings={settings}
        open={!!draftPreview}
        onClose={() => setDraftPreview(null)}
      />
      </div>
    </div>
  );
}

/** @deprecated alias kept to avoid type errors during migration */
type SaleItemRow = VoucherRow;
