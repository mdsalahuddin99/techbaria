"use client";

import { useSupplierLedgerQuery } from "../hooks";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { formatCurrency, formatDateTime } from "@/shared/lib/format";
import { Badge } from "@/shared/ui/badge";

export function SupplierLedger({ supplierId }: { supplierId: string }) {
  const { data, isLoading } = useSupplierLedgerQuery(supplierId, 1);

  if (isLoading) return <div className="p-4 text-center text-muted-foreground text-sm">Loading ledger...</div>;
  if (!data?.entries?.length) return <div className="p-4 text-center text-muted-foreground text-sm border rounded-md">No ledger history found.</div>;

  return (
    <div className="border rounded-md">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Type</TableHead>
            <TableHead>Notes</TableHead>
            <TableHead className="text-right">Amount</TableHead>
            <TableHead className="text-right">Advance Balance</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.entries.map((entry: any) => (
            <TableRow key={entry.id}>
              <TableCell className="whitespace-nowrap">{formatDateTime(entry.createdAt)}</TableCell>
              <TableCell>
                <Badge variant="outline" className="uppercase text-[10px]">
                  {entry.type}
                </Badge>
              </TableCell>
              <TableCell className="text-muted-foreground text-xs">
                {entry.notes || "—"}
              </TableCell>
              <TableCell className="text-right font-medium">
                <span className={entry.type === "PURCHASE" || entry.type === "REFUND" ? "text-destructive" : "text-emerald-600"}>
                  {(entry.type === "PURCHASE" || entry.type === "REFUND" ? "-" : "+")}
                  {formatCurrency(entry.amount)}
                </span>
              </TableCell>
              <TableCell className="text-right font-semibold">
                {formatCurrency(entry.balanceAfter)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
