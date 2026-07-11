"use client";

import { Card } from "@/shared/ui/card";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/shared/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { formatCurrency, formatDate } from "@/shared/lib/format";
import { Search, Plus, Trash2, Eye, Pencil, Printer, ClipboardList } from "lucide-react";
import { EmptyState } from "@/shared/components";
import type { PurchaseStatus } from "@/features/purchases/types";

const STATUSES: PurchaseStatus[] = ["Draft", "Ordered", "Received", "Partial"];

export const statusBadge = (s: PurchaseStatus) => {
  const cls =
    s === "Received" ? "border-accent text-accent" :
    s === "Partial" ? "border-warning text-warning" :
    s === "Ordered" ? "border-primary text-primary" :
    "border-muted-foreground text-muted-foreground";
  return <Badge variant="outline" className={cls}>{s}</Badge>;
};

interface PurchaseListProps {
  statusFilter: string;
  setStatusFilter: (s: string) => void;
  searchTerm: string;
  setSearchTerm: (s: string) => void;
  filtered: any[];
  isSearching: boolean;
  onNew: () => void;
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onPrint: (id: string) => void;
  onDelete: (id: string) => void;
  fetchNextPage?: () => void;
  hasNextPage?: boolean;
  isFetchingNextPage?: boolean;
}

export function PurchaseList({
  statusFilter, setStatusFilter, searchTerm, setSearchTerm, filtered, isSearching,
  onNew, onView, onEdit, onPrint, onDelete,
  fetchNextPage, hasNextPage, isFetchingNextPage
}: PurchaseListProps) {
  return (
    <>
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by PO # or supplier…"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
            {isSearching && (
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            )}
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="sm:w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={onNew} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="h-4 w-4 mr-2" />New Purchase
          </Button>
        </div>
      </Card>

      <Card>
        {/* Mobile: card list */}
        <div className="sm:hidden divide-y">
          {filtered.map((po) => {
            const units = po.items.reduce((s: number, i: any) => s + i.qty, 0);
            return (
              <div
                key={po.id}
                className="p-4 active:bg-secondary/40 transition-colors cursor-pointer"
                onClick={() => onView(po.id)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onView(po.id); }}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold">{po.poNumber}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{formatDate(po.createdAt)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="font-bold text-sm">{formatCurrency(po.subtotal - po.discount)}</p>
                    <div className="mt-1">{statusBadge(po.status)}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{po.supplierName}</p>
                    <p className="text-xs text-muted-foreground">{po.items.length} item{po.items.length !== 1 ? 's' : ''} · {units} units</p>
                  </div>
                  <div className="flex items-center gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onView(po.id)} title="View">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(po.id)} title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Desktop / tablet: table */}
        <div className="hidden sm:block overflow-x-auto">
          <Table className="whitespace-nowrap">
            <TableHeader>
              <TableRow>
                <TableHead>PO #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Supplier</TableHead>
                <TableHead className="text-right">Items</TableHead>
                <TableHead className="text-right">Units</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((po) => {
                const units = po.items.reduce((s: number, i: any) => s + i.qty, 0);
                return (
                  <TableRow key={po.id} className="cursor-pointer" onClick={() => onView(po.id)}>
                    <TableCell className="font-medium">{po.poNumber}</TableCell>
                    <TableCell>{formatDate(po.createdAt)}</TableCell>
                    <TableCell>{po.supplierName}</TableCell>
                    <TableCell className="text-right">{po.items.length}</TableCell>
                    <TableCell className="text-right">{units}</TableCell>
                    <TableCell className="text-right font-medium">{formatCurrency(po.subtotal - po.discount)}</TableCell>
                    <TableCell>{statusBadge(po.status)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-0.5">
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onView(po.id)} title="View">
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onEdit(po.id)} title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => onPrint(po.id)} title="Print Invoice">
                          <Printer className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => onDelete(po.id)} title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="p-0">
                    <EmptyState
                      icon={ClipboardList}
                      title="No purchase orders"
                      description='Click "New Purchase" to create one.'
                    />
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {hasNextPage && fetchNextPage && (
          <div className="p-4 flex justify-center border-t">
            <Button
              variant="outline"
              onClick={() => fetchNextPage()}
              disabled={isFetchingNextPage}
            >
              {isFetchingNextPage ? "Loading more..." : "Load More Purchases"}
            </Button>
          </div>
        )}
      </Card>
    </>
  );
}
