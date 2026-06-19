import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/shared/ui/tabs";
import { toast } from "sonner";
import { useActiveAccounts, useAccountActions } from "./hooks";
import { ACCOUNT_TYPE_LABEL } from "./types";
import { formatCurrency } from "@/shared/lib/format";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultMode?: "transfer" | "deposit" | "withdraw";
}

export function TransferDialog({ open, onOpenChange, defaultMode = "transfer" }: Props) {
  const accounts = useActiveAccounts();
  const { recordTransfer, recordDepositOrWithdraw } = useAccountActions();

  const [mode, setMode] = useState<"transfer" | "deposit" | "withdraw">(defaultMode);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setMode(defaultMode);
    setFrom(accounts[0]?.id ?? "");
    setTo(accounts[1]?.id ?? "");
    setAmount("");
    setNote("");
  }, [open, defaultMode, accounts]);

  const submit = () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) return toast.error("Amount দিন");
    if (mode === "transfer") {
      if (!from || !to || from === to) return toast.error("Different from/to account select করুন");
      const ok = recordTransfer({ fromAccountId: from, toAccountId: to, amount: amt, note });
      if (!ok) return toast.error("Transfer failed");
      toast.success("Transfer recorded");
    } else {
      const acc = mode === "deposit" ? to || from : from;
      if (!acc) return toast.error("Account select করুন");
      const ok = recordDepositOrWithdraw({
        accountId: acc,
        direction: mode === "deposit" ? "in" : "out",
        amount: amt,
        note,
      });
      if (!ok) return toast.error("Failed");
      toast.success(`${mode} recorded`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Account Movement</DialogTitle>
          <DialogDescription>Transfer / Deposit / Withdraw রেকর্ড করুন।</DialogDescription>
        </DialogHeader>

        <Tabs value={mode} onValueChange={(v) => setMode(v as "transfer" | "deposit" | "withdraw")}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="withdraw">Withdraw</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-3 mt-2">
          {(mode === "transfer" || mode === "withdraw") && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                {mode === "transfer" ? "From account" : "Account"}
              </label>
              <Select value={from} onValueChange={setFrom}>
                <SelectTrigger><SelectValue placeholder="Choose account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {ACCOUNT_TYPE_LABEL[a.type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          {(mode === "transfer" || mode === "deposit") && (
            <div>
              <label className="text-sm font-medium mb-1.5 block">
                {mode === "transfer" ? "To account" : "Account"}
              </label>
              <Select value={to} onValueChange={setTo}>
                <SelectTrigger><SelectValue placeholder="Choose account" /></SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} · {ACCOUNT_TYPE_LABEL[a.type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div>
            <label className="text-sm font-medium mb-1.5 block">Amount (৳)</label>
            <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="text-sm font-medium mb-1.5 block">Note (optional)</label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} />
          </div>
          {amount && (
            <p className="text-sm text-muted-foreground">
              Amount: <span className="font-semibold">{formatCurrency(Number(amount) || 0)}</span>
            </p>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={submit}>
            Record
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
