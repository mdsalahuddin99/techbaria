"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/shared/ui/dialog";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/ui/select";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { formatCurrency } from "@/shared/lib/format";
import { useAccounts } from "@/features/accounts/hooks";
import { salesApi } from "@/shared/api-client/sales";
import { Loader2 } from "lucide-react";
import { canPrint, printHtml, downloadHtml } from "@/shared/lib/print";
import { buildBulkReceiptHtml } from "@/shared/lib/printBulkReceipt";

const ACCOUNT_TYPE_LABEL: Record<string, string> = {
  cash: "Cash",
  bank: "Bank Account",
  mobile_banking: "Mobile Banking",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: {
    id: string;
    name: string;
    due: number;
    balance: number;
  };
}

export function BulkDueCollectDialog({ open, onOpenChange, customer }: Props) {
  const qc = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [amount, setAmount] = useState(customer.due.toString());
  const [method, setMethod] = useState<string | "Wallet">("");
  const [accountId, setAccountId] = useState("");
  const [notes, setNotes] = useState("");
  const [receiptData, setReceiptData] = useState<any>(null);

  const allAccounts = useAccounts();
  const accounts = allAccounts.filter((a) => a.type === method);

  const handlePrint = () => {
    if (!receiptData) return;
    const html = buildBulkReceiptHtml(receiptData);
    if (!canPrint()) {
      toast.error("Printing isn't supported on this device", {
        description: "Downloading the receipt as an HTML file instead.",
      });
      downloadHtml(html, `receipt-${receiptData.transactionId}`);
      return;
    }
    const ok = printHtml(html, `receipt-${receiptData.transactionId}`);
    if (!ok) {
      toast.warning("Print window blocked", {
        description: "We've downloaded the receipt instead — open it to print.",
      });
      downloadHtml(html, `receipt-${receiptData.transactionId}`);
    }
    
    // Close the dialog after a short delay so the user sees the print window opening
    setTimeout(() => {
      onOpenChange(false);
      setReceiptData(null);
    }, 1000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) return toast.error("Enter a valid amount");
    if (numAmount > customer.due) return toast.error("Amount cannot exceed total due");
    if (!method) return toast.error("Select a payment method");
    if (method !== "Wallet" && !accountId) return toast.error("Select a ledger account");
    if (method === "Wallet" && numAmount > customer.balance) return toast.error("Insufficient wallet advance balance");

    setIsSubmitting(true);
    try {
      const result = await salesApi.bulkCollectDue({
        customerId: customer.id,
        amount: numAmount,
        accountId: method === "Wallet" ? "WALLET" : accountId,
        type: method,
        notes,
      });

      toast.success(`Successfully collected ${formatCurrency(numAmount)} due`);
      qc.invalidateQueries({ queryKey: ["customers"] });
      qc.invalidateQueries({ queryKey: ["sales"] });
      qc.invalidateQueries({ queryKey: ["customer-ledger", customer.id] });
      
      // Store result to show receipt
      setReceiptData({
        ...result,
        customerName: customer.name,
      });

      // Automatically print after a short delay for state to update
      setTimeout(() => {
        handlePrint();
      }, 500);

    } catch (error: any) {
      toast.error(error.message || "Failed to collect due");
    } finally {
      setIsSubmitting(false);
    }
  };

  // If we have receipt data, show the print view
  if (receiptData) {
    return (
      <Dialog open={open} onOpenChange={(val) => {
        if (!val) {
          onOpenChange(false);
          setReceiptData(null);
        }
      }}>
        <DialogContent className="sm:max-w-md flex flex-col items-center">
          <DialogHeader>
            <DialogTitle>Payment Successful</DialogTitle>
            <DialogDescription>Generating receipt...</DialogDescription>
          </DialogHeader>
          <div className="py-8 flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Please wait while the print dialog opens.</p>
          </div>
          <Button onClick={handlePrint} className="w-full">Reprint Receipt</Button>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Collect Total Due</DialogTitle>
          <DialogDescription>
            Collect due for multiple invoices at once. The system will automatically clear older invoices first.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4 bg-muted/30 p-3 rounded-md mb-4 border">
            <div>
              <Label className="text-xs text-muted-foreground">Total Due</Label>
              <div className="font-semibold text-destructive text-lg">{formatCurrency(customer.due)}</div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Advance Balance</Label>
              <div className="font-semibold text-emerald-600 text-lg">{formatCurrency(customer.balance)}</div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              max={customer.due}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="method">Account Type *</Label>
              <Select
                value={method}
                onValueChange={(v) => {
                  setMethod(v);
                  setAccountId(v === "Wallet" ? "WALLET" : "");
                }}
              >
                <SelectTrigger id="method">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ACCOUNT_TYPE_LABEL).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                  {customer.balance > 0 && (
                    <SelectItem value="Wallet">Wallet (Advance)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {method && method !== "Wallet" && (
              <div className="space-y-2">
                <Label htmlFor="account">Deposit Ledger *</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger id="account">
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Input
              id="notes"
              placeholder="Optional notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Collect Due & Print
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
