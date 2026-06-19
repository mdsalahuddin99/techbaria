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
import { ChevronLeft, ChevronRight, Receipt, Wallet, Undo2, SlidersHorizontal, FileX } from "lucide-react";
import { formatCurrency, formatDate, formatDateTime } from "@/shared/lib/format";
import { useCustomerLedger } from "./ledgerHooks";

interface Props {
  customerId: string;
}

const typeMeta: Record<string, { label: string; color: "default" | "secondary" | "destructive" | "outline"; icon: typeof Receipt }> = {
  SALE: { label: "Sale", color: "default", icon: Receipt },
  PAYMENT: { label: "Payment", color: "secondary", icon: Wallet },
  REFUND: { label: "Refund", color: "destructive", icon: Undo2 },
  ADJUSTMENT: { label: "Adjustment", color: "outline", icon: SlidersHorizontal },
  WRITE_OFF: { label: "Write Off", color: "destructive", icon: FileX },
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
              const meta = typeMeta[entry.type] ?? { label: entry.type, color: "outline" as const, icon: Receipt };
              const Icon = meta.icon;
              const isCredit = entry.type === "PAYMENT" || entry.type === "REFUND" || entry.type === "WRITE_OFF";
              return (
                <TableRow key={entry.id}>
                  <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatDateTime(entry.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={meta.color} className="gap-1 text-[10px]">
                      <Icon className="h-3 w-3" />
                      {meta.label}
                    </Badge>
                  </TableCell>
                  <TableCell className={`text-right font-medium tabular-nums ${isCredit ? "text-emerald-600" : "text-destructive"}`}>
                    {isCredit ? "-" : "+"}{formatCurrency(Math.abs(entry.amount))}
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
