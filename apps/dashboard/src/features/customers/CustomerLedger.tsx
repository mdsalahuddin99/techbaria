/**
 * CustomerLedger — scrollable transaction history table.
 */
"use client";

import { useMemo, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/ui/table";
import { Badge } from "@/shared/ui/badge";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Skeleton } from "@/shared/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { ChevronLeft, ChevronRight, Receipt, Wallet, Undo2, SlidersHorizontal, FileX, ArrowDownToLine, Printer } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/lib/format";
import { toast } from "sonner";
import { useCustomerLedger } from "./ledgerHooks";

interface Props {
  customerId: string;
}

const typeMeta: Record<string, { label: string; className: string; icon: typeof Receipt }> = {
  SALE:       { label: "Sale (Credit)",    className: "bg-blue-50 text-blue-600 border-blue-100",     icon: Receipt },
  PAYMENT:    { label: "Due Collection",   className: "bg-emerald-50 text-emerald-600 border-emerald-100",   icon: Wallet },
  REFUND:     { label: "Refund",           className: "bg-orange-50 text-orange-600 border-orange-100", icon: Undo2 },
  ADJUSTMENT: { label: "Advance Deposit",  className: "bg-purple-50 text-purple-600 border-purple-100",     icon: ArrowDownToLine },
  WRITE_OFF:  { label: "Write Off",        className: "bg-red-50 text-red-600 border-red-100", icon: FileX },
};

export function CustomerLedger({ customerId }: Props) {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useCustomerLedger(customerId, page);

  const entries = data?.entries ?? [];
  const totalPages = data?.totalPages ?? 1;

  const [selectedEntry, setSelectedEntry] = useState<any | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-2">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-8 w-full" />
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        No transactions yet
      </div>
    );
  }

  return (
    <div>
      <div className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isLegacyDeposit =
                entry.type === "PAYMENT" &&
                (entry.notes?.toLowerCase().includes("advance deposit") ||
                  entry.balanceAfter > entry.balanceBefore);

              const isSaleReversal =
                entry.type === "ADJUSTMENT" && entry.amount < 0;

              const effectiveType = isLegacyDeposit
                ? "ADJUSTMENT"
                : entry.type;

              const meta =
                typeMeta[effectiveType] ??
                { label: entry.type, className: "bg-slate-50 text-slate-600 border-slate-200", icon: Receipt };
              const Icon = isSaleReversal ? Undo2 : meta.icon;
              const effectiveLabel = isSaleReversal ? "Sale Reversal" : meta.label;

              const isDebit =
                !isLegacyDeposit &&
                (entry.type === "SALE" ||
                  entry.type === "WRITE_OFF" ||
                  (entry.type === "PAYMENT" && !isLegacyDeposit) ||
                  isSaleReversal);

              return (
                <TableRow 
                  key={entry.id}
                  className="cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() => setSelectedEntry({ ...entry, effectiveLabel, meta, isDebit, Icon })}
                >
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 text-[10px] shadow-none ${meta.className}`}>
                      <Icon className="h-3 w-3" />
                      {effectiveLabel}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-medium tabular-nums ${
                    isDebit ? "text-destructive" : "text-emerald-600"
                  }`}>
                    {isDebit ? "-" : "+"}{formatCurrency(Math.abs(entry.amount))}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-3">
          <p className="text-xs text-muted-foreground">
            Page {page} of {totalPages} ({data?.total} entries)
          </p>
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="h-8 w-8"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Transaction Details Modal */}
      {selectedEntry && (
        <Dialog open={!!selectedEntry} onOpenChange={(open) => !open && setSelectedEntry(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Transaction Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="text-sm text-muted-foreground">Type</span>
                <Badge variant="outline" className={`gap-1 shadow-none ${selectedEntry.meta.className}`}>
                  <selectedEntry.Icon className="h-3.5 w-3.5" />
                  {selectedEntry.effectiveLabel}
                </Badge>
              </div>
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="text-sm text-muted-foreground">Amount</span>
                <span className={`font-semibold text-lg ${
                  selectedEntry.isDebit ? "text-destructive" : "text-emerald-600"
                }`}>
                  {selectedEntry.isDebit ? "-" : "+"}{formatCurrency(Math.abs(selectedEntry.amount))}
                </span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="text-sm text-muted-foreground">Date</span>
                <span className="text-sm font-medium">{formatDateTime(selectedEntry.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="text-sm text-muted-foreground">Balance Before</span>
                <span className="text-sm font-medium">{formatCurrency(selectedEntry.balanceBefore)}</span>
              </div>
              <div className="flex items-center justify-between pb-3 border-b">
                <span className="text-sm text-muted-foreground">Balance After</span>
                <span className="text-sm font-medium text-emerald-600">{formatCurrency(selectedEntry.balanceAfter)}</span>
              </div>
              {selectedEntry.reference && (
                <div className="flex items-center justify-between pb-3 border-b">
                  <span className="text-sm text-muted-foreground">Reference</span>
                  <span className="text-sm font-medium">{selectedEntry.reference}</span>
                </div>
              )}
              {selectedEntry.notes && (
                <div className="flex flex-col gap-1 pb-3 border-b">
                  <span className="text-sm text-muted-foreground">Notes</span>
                  <p className="text-sm">{selectedEntry.notes}</p>
                </div>
              )}
            </div>
            {selectedEntry.reference?.startsWith("BULK-COLLECT") && (
              <Button 
                variant="outline" 
                className="w-full mt-4" 
                onClick={async (e) => {
                  const target = e.currentTarget;
                  const originalText = target.innerText;
                  target.innerText = "Loading Receipt...";
                  target.disabled = true;
                  try {
                    const { getBulkReceiptDataAction } = await import("@/server/actions/sales");
                    const { buildBulkReceiptHtml } = await import("@/shared/lib/printBulkReceipt");
                    const { canPrint, printHtml, downloadHtml } = await import("@/shared/lib/print");
                    const data = await getBulkReceiptDataAction(selectedEntry.reference);
                    const html = buildBulkReceiptHtml(data);
                    
                    if (!canPrint()) {
                      downloadHtml(html, `receipt-${data.transactionId}`);
                    } else {
                      const ok = printHtml(html, `receipt-${data.transactionId}`);
                      if (!ok) downloadHtml(html, `receipt-${data.transactionId}`);
                    }
                  } catch (err: any) {
                    toast.error(err.message || "Failed to load receipt");
                  } finally {
                    target.innerText = originalText;
                    target.disabled = false;
                  }
                }}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print Receipt
              </Button>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
