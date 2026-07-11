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
import { ChevronLeft, ChevronRight, Receipt, Wallet, Undo2, SlidersHorizontal, FileX, ArrowDownToLine } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/lib/format";
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
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="text-right hidden sm:table-cell">Before</TableHead>
              <TableHead className="text-right hidden sm:table-cell">After</TableHead>
              <TableHead className="hidden md:table-cell">Reference</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              // Smart back-compat: old `depositAdvance` records were saved with type=PAYMENT
              // (before the fix). Detect them by their notes and display correctly.
              const isLegacyDeposit =
                entry.type === "PAYMENT" &&
                (entry.notes?.toLowerCase().includes("advance deposit") ||
                  entry.balanceAfter > entry.balanceBefore); // balance went UP → was a deposit

              // Negative ADJUSTMENT = sale reversal (from our new update path)
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
              // ADJUSTMENT (positive) = advance deposit → '+'
              // ADJUSTMENT (negative) = sale reversal → '-'
              // REFUND = wallet credit → '+'
              // SALE/PAYMENT/WRITE_OFF = debit → '-'
              return (
                <TableRow key={entry.id}>
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
                  <TableCell className="text-right tabular-nums hidden sm:table-cell text-muted-foreground">
                    {formatCurrency(entry.balanceBefore)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums hidden sm:table-cell font-medium">
                    {formatCurrency(entry.balanceAfter)}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground hidden md:table-cell">
                    {entry.reference ?? "—"}
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
    </div>
  );
}
