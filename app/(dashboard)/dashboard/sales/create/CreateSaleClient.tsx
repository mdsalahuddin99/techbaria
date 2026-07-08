"use client";

import React, { useMemo, useState, useEffect, useCallback, useRef } from "react";
import { usePageTitle } from "@/shared/hooks/usePageTitle";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { useSearchParams, useRouter } from "next/navigation";
import { useAuth } from "@/features/auth/AuthProvider";

import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import { toast } from "sonner";
import { formatCurrency, productDisplayName, round2 } from "@/shared/lib/format";
import type { Sale, PaymentMethod, SalePayment } from "@/shared/lib/types";
import CameraScanner from "@/components/CameraScanner";
import {
  InvoicePreview,
  type ReceiptView,
  DraftInvoicePreview,
  type HeldSaleForPrint,
  InvoiceHeader,
  ProductFilterBar,
  InvoiceLineItems,
  PaymentCollector,
  CustomerSidebar,
} from "@/features/sales/components";
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
    changeDiscount, removeRow, clearVoucher, holdCurrentSale,
    resumeHeldSale, deleteHeldSale, handleCheckout, handleCameraBarcode
  } = useCreateSale();

  return (
    <div className="w-full max-w-[1600px] mx-auto p-0 space-y-6">
      {/* ── Premium POS Header (Light Theme) ── */}
      <div className="relative overflow-hidden rounded-xl bg-white/80 backdrop-blur-xl border border-slate-200/60 p-3 sm:px-4 sm:py-3 shadow-sm">
        {/* Subtle background glow for premium feel */}
        <div className="absolute -top-12 -right-12 h-32 w-32 bg-indigo-500/10 blur-[40px] rounded-full pointer-events-none" />
        <div className="absolute -bottom-12 -left-12 h-32 w-32 bg-emerald-500/10 blur-[40px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          {/* Left Side: Title & Info */}
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
              {editingSaleId ? "Edit Sale Invoice" : "New Sale Invoice"}
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
          <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
            <Button
              variant="outline"
              onClick={() => router.push("/dashboard/sales")}
              className="h-9 px-3 border-slate-200 bg-white text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 flex items-center gap-1.5 shadow-sm transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              Invoice Search
            </Button>

            <Popover open={heldOpen} onOpenChange={setHeldOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="h-9 px-3 border-slate-200 bg-white text-xs font-semibold rounded-lg hover:bg-slate-50 text-slate-700 relative flex items-center gap-1.5 shadow-sm transition-colors"
                >
                  <FileText className="h-3.5 w-3.5 text-slate-400" />
                  Draft Invoices
                  {heldSales.length > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-indigo-600 text-white text-[9px] h-4 w-4 flex items-center justify-center rounded-full font-bold shadow-sm">
                      {heldSales.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-96 p-0 z-50">
                <div className="px-3 py-2.5 border-b bg-muted/40">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">Draft Invoices / Quotations</h3>
                </div>
                {heldSales.length === 0 ? (
                  <div className="p-6 text-center">
                    <FileText className="h-8 w-8 mx-auto text-muted-foreground/40 mb-2" />
                    <p className="text-sm text-muted-foreground">No draft invoices</p>
                    <p className="text-[11px] text-muted-foreground/60 mt-1">Hold a sale to create a draft</p>
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
                              title="Resume this draft"
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
                                onClick={() => deleteHeldSale(h.id)}
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
                className="h-9 px-3 text-xs font-semibold rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear Cart
              </Button>
            )}

            {/* Global Search trigger bar inside the page */}
            <div className="w-full sm:w-56 relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              <Input
                placeholder="Search products, customers..."
                onClick={() => {
                  window.dispatchEvent(new CustomEvent("cmd:open-palette"));
                }}
                className="pl-8 h-9 bg-white border-slate-200 text-xs text-slate-700 placeholder-slate-400 rounded-lg cursor-pointer w-full focus:ring-2 focus:ring-indigo-500/20 hover:border-slate-300 transition-colors shadow-sm"
                readOnly
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Tier 1: Left Sidebar */}
        <div className="w-full lg:w-72 shrink-0">
          <CustomerSidebar
            customers={[]}
            customerId={voucherCustomerId}
            onCustomerChange={setVoucherCustomerId}
          />
        </div>

        {/* Right Content Column */}
        <div className="flex-1 space-y-6 min-w-0 pb-20 relative">
          {/* Invoice card */}
          <div className="bg-card rounded-2xl border border-border/50 shadow-lg p-4 md:p-6 space-y-5 transition-shadow hover:shadow-xl">
            {warehouses?.length > 1 && (
              <>
                <InvoiceHeader
                  warehouses={warehouses}
                  selectedWarehouseId={selectedWarehouseId}
                  onWarehouseChange={(id) => {
                    setSelectedWarehouseId(id);
                    clearVoucher();
                  }}
                  editMode={!!editingSaleId}
                />
                <div className="border-t border-border" />
              </>
            )}

            {/* Product search + filter bar */}
            {!selectedWarehouseId ? (
              <div className="text-center py-6 text-sm text-slate-400">
                {isLoading ? "Loading POS data..." : "No warehouse selected"}
              </div>
            ) : (
              <>
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

                <div className="border-t border-border" />

                {/* Line items table */}
                <InvoiceLineItems
                  rows={voucherRows}
                  onChangeQty={changeQty}
                  onChangeSerials={changeSerials}
                  onChangeWarranty={changeWarranty}
                  onChangeDiscount={changeDiscount}
                  onRemoveRow={removeRow}
                  searchInputRef={vSearchRef}
                />

                {/* Invoice subtotal summary (above payment) */}
                {voucherRows.length > 0 && (
                  <div className="flex justify-end pt-2">
                    <div className="text-xs text-slate-500 font-medium">
                      {voucherRows.length} item{voucherRows.length !== 1 ? "s" : ""} ·{" "}
                      Subtotal:{" "}
                      <span className="font-extrabold text-slate-800 tabular-nums">
                        {formatCurrency(subtotal)}
                      </span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Bottom Section: Payment & Details (only when there are items in the cart) */}
          {voucherRows.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Sub-column: Additional Details */}
              <div className="lg:col-span-4 space-y-4">
                <div className="bg-secondary/20 rounded-2xl border border-border/50 p-5 space-y-4 shadow-md transition-shadow hover:shadow-lg">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 border-b border-border pb-2">
                    Additional Details
                  </h3>
                  <div className="space-y-3.5">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Sales Person
                        </label>
                        <Input
                          type="text"
                          value={salesPerson}
                          onChange={(e) => setSalesPerson(e.target.value)}
                          placeholder="Write sales person name…"
                          className="h-9 text-sm border-border bg-card rounded-[4px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Invoice Date
                        </label>
                        <Input
                          type="date"
                          value={invoiceDate}
                          onChange={(e) => setInvoiceDate(e.target.value)}
                          className="h-9 text-sm border-border bg-card rounded-[4px]"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Destination
                        </label>
                        <Input
                          type="text"
                          value={destination}
                          onChange={(e) => setDestination(e.target.value)}
                          placeholder="Destination…"
                          className="h-9 text-sm border-border bg-card rounded-[4px]"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                          Attention
                        </label>
                        <Input
                          type="text"
                          value={attention}
                          onChange={(e) => setAttention(e.target.value)}
                          placeholder="Attention…"
                          className="h-9 text-sm border-border bg-card rounded-[4px]"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">
                        Invoice Notes / Narration
                      </label>
                      <textarea
                        value={narration}
                        onChange={(e) => setNarration(e.target.value)}
                        placeholder="Write invoice notes or narration here..."
                        rows={3}
                        className="w-full text-sm border border-border bg-card rounded-[4px] p-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Sub-column: Payment Collector */}
              <div className="lg:col-span-8 space-y-4">
                <PaymentCollector
                  subtotal={subtotal}
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
                />
              </div>
            </div>
          )}

          {/* Checkout & Action Buttons (Sticky at bottom of viewport) */}
          {voucherRows.length > 0 && (
            <div className="sticky bottom-0 bg-card/80 backdrop-blur-xl border-t border-x border-border/50 p-5 rounded-t-2xl shadow-[0_-10px_40px_rgba(0,0,0,0.1)] flex flex-wrap items-center justify-between gap-4 z-30 transition-all duration-300">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  className="border-border text-slate-600 h-10 rounded-[4px] font-semibold hover:bg-secondary text-xs"
                  onClick={() => router.push("/dashboard/sales")}
                >
                  Cancel
                </Button>

                {voucherRows.length > 0 && !editingSaleId && (
                  <Button variant="outline" className="h-10 rounded-[4px] font-semibold hover:bg-secondary text-xs" onClick={holdCurrentSale}>
                    <FileText className="h-4 w-4 mr-1.5" /> Save Draft
                  </Button>
                )}
              </div>

              <div className="flex items-center gap-2">
                {receipt && (
                  <>
                    <Button
                      variant="outline"
                      className="border-border h-10 text-xs rounded-[4px] font-semibold hover:bg-secondary"
                      onClick={() => setReceiptView("thermal")}
                    >
                      <Printer className="h-4 w-4 mr-1.5" /> Thermal
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border h-10 text-xs rounded-[4px] font-semibold hover:bg-secondary"
                      onClick={() => setReceiptView("invoice")}
                    >
                      <Printer className="h-4 w-4 mr-1.5" /> A4
                    </Button>
                    <Button
                      variant="outline"
                      className="border-border h-10 text-xs rounded-[4px] font-semibold hover:bg-secondary"
                      onClick={() => {
                        clearVoucher();
                        setReceipt(null);
                        setReceiptView(null);
                      }}
                    >
                      <Plus className="h-4 w-4 mr-1.5" /> New Invoice
                    </Button>
                  </>
                )}
                <LoadingButton
                  loading={isCheckingOut || saleLoading}
                  disabled={voucherRows.length === 0 || !selectedWarehouseId}
                  className="h-10 bg-primary text-primary-foreground shadow-none hover:bg-primary/95 min-w-32 rounded-[4px] font-bold text-xs"
                  onClick={handleCheckout}
                >
                  <CheckCircle2 className="h-4 w-4 mr-1.5" />
                  {editingSaleId ? "Update Invoice" : "Save Invoice"}
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
