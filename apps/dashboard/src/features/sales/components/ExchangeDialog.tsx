"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Checkbox } from "@/shared/ui/checkbox";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { Search, Plus, Trash2 } from "lucide-react";
import { formatCurrency } from "@/shared/lib/format";
import type { Sale } from "@/shared/lib/types";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { useActiveAccounts } from "@/features/accounts/hooks";

interface ExchangeDialogProps {
  sale: Sale | null;
  onClose: () => void;
}

export function ExchangeDialog({ sale, onClose }: ExchangeDialogProps) {
  const [returnQtys, setReturnQtys] = useState<Record<string, number>>({});
  const [restock, setRestock] = useState<Record<string, boolean>>({});
  
  const [newItems, setNewItems] = useState<Array<any>>([]);
  const [search, setSearch] = useState("");
  
  const [reason, setReason] = useState("");
  const [tenders, setTenders] = useState<Array<{ type: string; amount: number; accountId?: string }>>([]);
  const [refundMethod, setRefundMethod] = useState<string>("");

  const accounts = useActiveAccounts();
  const paymentMethods = ["Cash", "Card", "Mobile Banking", "Bank Transfer", "Cheque"];

  // Fetch products for search
  const { data: searchResults } = useQuery({
    queryKey: ["products-search", search],
    queryFn: async () => {
      if (!search || search.length < 2) return [];
      const res = await fetch(`/api/products?search=${encodeURIComponent(search)}&limit=5`);
      if (!res.ok) return [];
      const json = await res.json();
      return json.data.items || [];
    },
    enabled: search.length >= 2,
  });

  const handleReturnChange = (productId: string, qty: number) => {
    setReturnQtys((prev) => ({ ...prev, [productId]: qty }));
    if (qty > 0 && restock[productId] === undefined) {
      setRestock((prev) => ({ ...prev, [productId]: true }));
    }
  };

  const addNewItem = (product: any) => {
    setNewItems((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) => (i.productId === product.id ? { ...i, qty: i.qty + 1 } : i));
      }
      return [...prev, { productId: product.id, name: product.name, qty: 1, price: product.price }];
    });
    setSearch("");
  };

  const removeNewItem = (productId: string) => {
    setNewItems((prev) => prev.filter((i) => i.productId !== productId));
  };

  const updateNewItemQty = (productId: string, qty: number) => {
    setNewItems((prev) => prev.map((i) => (i.productId === productId ? { ...i, qty } : i)));
  };

  const totalReturn = useMemo(() => {
    if (!sale) return 0;
    return sale.items.reduce((sum, item) => {
      const qty = returnQtys[item.productId] || 0;
      // Rough proportional discount logic
      const unitDiscount = (item.discount || 0) / item.qty;
      return sum + (item.price * qty) - (unitDiscount * qty);
    }, 0);
  }, [sale, returnQtys]);

  const totalNew = useMemo(() => {
    return newItems.reduce((sum, item) => sum + (item.price * item.qty), 0);
  }, [newItems]);

  const netDifference = totalNew - totalReturn;

  const handleSubmit = async () => {
    if (!sale) return;
    const itemsToReturn = Object.entries(returnQtys)
      .filter(([_, qty]) => qty > 0)
      .map(([productId, qty]) => ({
        productId,
        qty,
        restock: !!restock[productId],
      }));

    if (itemsToReturn.length === 0 && newItems.length === 0) {
      toast.error("Please select items to return or add new items");
      return;
    }

    if (!reason) {
      toast.error("Please provide a reason for the exchange");
      return;
    }

    const payload = {
      returnItems: itemsToReturn,
      newItems: newItems.map(i => ({ productId: i.productId, name: i.name, qty: i.qty, price: Number(i.price) })),
      reason,
      tenders: netDifference > 0 ? tenders : undefined,
      refundMethod: netDifference < 0 ? refundMethod : undefined,
    };

    try {
      const res = await fetch(`/api/sales/${sale.id}/exchange`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to process exchange");
      }

      toast.success("Exchange processed successfully!");
      onClose();
      window.location.reload(); // Refresh to show new state
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <Dialog open={!!sale} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Process Exchange</DialogTitle>
          <DialogDescription>
            Return items from Invoice {sale?.invoiceNo} and issue new items.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Left: Return Items */}
          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2">1. Items to Return</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-24">Return Qty</TableHead>
                  <TableHead className="w-20 text-center">Restock</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sale?.items.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Purchased: {item.qty} | Price: {formatCurrency(item.price)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="0"
                        max={item.qty}
                        value={returnQtys[item.productId] || ""}
                        onChange={(e) => handleReturnChange(item.productId, parseInt(e.target.value) || 0)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell className="text-center">
                      <Checkbox
                        checked={restock[item.productId] !== false}
                        onCheckedChange={(c) => setRestock((p) => ({ ...p, [item.productId]: !!c }))}
                        disabled={!(returnQtys[item.productId] > 0)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="flex justify-between font-bold bg-muted/30 p-2 rounded">
              <span>Return Value:</span>
              <span className="text-destructive">{formatCurrency(totalReturn)}</span>
            </div>
          </div>

          {/* Right: New Items */}
          <div className="space-y-4">
            <h3 className="font-semibold border-b pb-2">2. New Items to Issue</h3>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search products to add..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
              {searchResults && searchResults.length > 0 && search.length >= 2 && (
                <div className="absolute top-full left-0 right-0 bg-background border shadow-lg rounded-md mt-1 z-50 max-h-48 overflow-y-auto">
                  {searchResults.map((p: any) => (
                    <div
                      key={p.id}
                      className="p-2 hover:bg-muted cursor-pointer flex justify-between items-center"
                      onClick={() => addNewItem(p)}
                    >
                      <div>
                        <div className="text-sm font-medium">{p.name}</div>
                        <div className="text-xs text-muted-foreground">Stock: {p.stock}</div>
                      </div>
                      <div className="text-sm font-semibold">{formatCurrency(p.price)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Item</TableHead>
                  <TableHead className="w-20">Qty</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {newItems.map((item) => (
                  <TableRow key={item.productId}>
                    <TableCell>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs">{formatCurrency(item.price)}</div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => updateNewItemQty(item.productId, parseInt(e.target.value) || 1)}
                        className="h-8"
                      />
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeNewItem(item.productId)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {newItems.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground py-4">
                      No new items added.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
            <div className="flex justify-between font-bold bg-muted/30 p-2 rounded">
              <span>New Value:</span>
              <span className="text-primary">{formatCurrency(totalNew)}</span>
            </div>
          </div>
        </div>

        {/* Bottom: Summary & Settlement */}
        <div className="mt-6 space-y-4 border-t pt-4">
          <div className="flex justify-between items-center bg-secondary p-4 rounded-lg">
            <span className="text-lg font-bold">Net Difference:</span>
            <span className={`text-xl font-bold ${netDifference > 0 ? "text-primary" : netDifference < 0 ? "text-destructive" : ""}`}>
              {netDifference > 0 ? `Customer Owes: ${formatCurrency(netDifference)}` : netDifference < 0 ? `Refund to Customer: ${formatCurrency(Math.abs(netDifference))}` : "Even Exchange"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Reason for Exchange</Label>
              <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Defective, Wrong size..." />
            </div>
            
            {netDifference > 0 && (
              <div>
                <Label>Collect Payment</Label>
                <div className="flex gap-2 mt-1">
                  <Select value={tenders[0]?.type || ""} onValueChange={(v) => setTenders([{ type: v, amount: netDifference }])}>
                    <SelectTrigger><SelectValue placeholder="Payment Method" /></SelectTrigger>
                    <SelectContent>
                      {paymentMethods.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {netDifference < 0 && (
              <div>
                <Label>Refund Method (from shop account)</Label>
                <Select value={refundMethod} onValueChange={setRefundMethod}>
                  <SelectTrigger className="mt-1"><SelectValue placeholder="Select Account" /></SelectTrigger>
                  <SelectContent>
                    {accounts.map((a: any) => (
                      <SelectItem key={a.id} value={a.name}>{a.name} ({formatCurrency(a.balance)})</SelectItem>
                    ))}
                    <SelectItem value="WALLET">Customer Wallet (Due Credit)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={netDifference > 0 && tenders.length === 0 || netDifference < 0 && !refundMethod || !reason}>
            Confirm Exchange
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
