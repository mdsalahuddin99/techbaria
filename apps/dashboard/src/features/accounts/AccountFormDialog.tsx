import { useEffect, useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import { LoadingButton } from "@/shared/ui/loading-button";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/shared/ui/select";
import { Switch } from "@/shared/ui/switch";
import { toast } from "sonner";
import {
  ACCOUNT_TYPE_LABEL, AccountType, FinancialAccount,
} from "./types";
import { useAccountActions, useActiveAccounts } from "./hooks";
import { flattenAccountTree } from "./tree";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: FinancialAccount | null;
}

const NO_PARENT = "__none__";

const empty = {
  name: "",
  type: "cash" as AccountType,
  openingBalance: "",
  parentId: NO_PARENT,
  bankName: "",
  accountNumber: "",
  branch: "",
  provider: "",
  walletNumber: "",
  isDefault: false,
};

export function AccountFormDialog({ open, onOpenChange, editing }: Props) {
  const { addAccount, updateAccount, setDefaultAccount } = useAccountActions();
  const allAccounts = useActiveAccounts();
  const [v, setV] = useState(empty);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (editing) {
      setV({
        name: editing.name,
        type: editing.type,
        openingBalance: String(editing.openingBalance || ""),
        parentId: editing.parentId ?? NO_PARENT,
        bankName: editing.details?.bankName ?? "",
        accountNumber: editing.details?.accountNumber ?? "",
        branch: editing.details?.branch ?? "",
        provider: editing.details?.provider ?? "",
        walletNumber: editing.details?.walletNumber ?? "",
        isDefault: !!editing.isDefault,
      });
    } else {
      setV(empty);
    }
  }, [open, editing]);

  // Eligible parents: same type, not self, not a descendant (avoid cycles).
  const parentOptions = (() => {
    const sameType = allAccounts.filter((a) => a.type === v.type && a.id !== editing?.id);
    if (!editing) return sameType;
    const descendants = new Set<string>();
    const collect = (id: string) => {
      for (const a of allAccounts) {
        if (a.parentId === id && !descendants.has(a.id)) {
          descendants.add(a.id);
          collect(a.id);
        }
      }
    };
    collect(editing.id);
    return sameType.filter((a) => !descendants.has(a.id));
  })();
  const parentTree = flattenAccountTree(parentOptions);

  const submit = () => {
    setSaving(true);
    try {
      if (!v.name.trim()) return toast.error("Name দিন");
      const opening = Number(v.openingBalance) || 0;
      const parentId = v.parentId && v.parentId !== NO_PARENT ? v.parentId : null;
      const details =
        v.type === "bank"
          ? { bankName: v.bankName || undefined, accountNumber: v.accountNumber || undefined, branch: v.branch || undefined }
          : v.type === "mobile_banking"
          ? { provider: v.provider || undefined, walletNumber: v.walletNumber || undefined }
          : undefined;

      if (editing) {
        updateAccount(editing.id, {
          name: v.name.trim(),
          type: v.type,
          openingBalance: opening,
          parentId,
          details,
        });
        if (v.isDefault) setDefaultAccount(editing.id);
        toast.success("Account updated");
      } else {
        addAccount({
          name: v.name.trim(),
          type: v.type,
          openingBalance: opening,
          parentId,
          details,
          isDefault: v.isDefault,
        });
        toast.success("Account created");
      }
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-center text-xl">{editing ? "Edit" : "New"} Account</DialogTitle>
          <DialogDescription className="text-center mt-2">
            Cash, Bank বা Mobile Banking — প্রতিটা type-এ যত খুশি account রাখতে পারেন।
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 px-2 sm:px-8 mt-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <label className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium">Type</label>
            <div className="flex-1 min-w-0">
              <Select
                value={v.type}
                onValueChange={(val) => setV({ ...v, type: val as AccountType })}
                disabled={!!editing}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(["cash", "bank", "mobile_banking"] as AccountType[]).map((t) => (
                    <SelectItem key={t} value={t}>{ACCOUNT_TYPE_LABEL[t]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
            <label className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium">Account name</label>
            <div className="flex-1 min-w-0">
              <Input
                value={v.name}
                onChange={(e) => setV({ ...v, name: e.target.value })}
                placeholder={
                  v.type === "cash" ? "Main Cash" :
                  v.type === "bank" ? "DBBL Current A/C" : "bKash Personal"
                }
              />
            </div>
          </div>
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
            <div className="w-full sm:w-[120px] shrink-0 pt-2">
              <label className="text-left font-medium">Parent ledger</label>
              <span className="block text-[10px] text-muted-foreground font-normal">(optional)</span>
            </div>
            <div className="flex-1 min-w-0">
              <Select
                value={v.parentId}
                onValueChange={(val) => setV({ ...v, parentId: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Top-level ledger" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_PARENT}>— None (top-level) —</SelectItem>
                  {parentTree.map((n) => (
                    <SelectItem key={n.account.id} value={n.account.id}>
                      {"\u00A0".repeat(n.depth * 2)}{n.depth > 0 ? "↳ " : ""}{n.account.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                Sub-ledger বানাতে একটি parent select করুন। একই type-এর account-ই parent হতে পারে।
              </p>
            </div>
          </div>
          {v.type === "bank" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <label className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium text-muted-foreground">Bank name</label>
                <div className="flex-1 min-w-0">
                  <Input value={v.bankName} onChange={(e) => setV({ ...v, bankName: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <label className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium text-muted-foreground">Branch</label>
                <div className="flex-1 min-w-0">
                  <Input value={v.branch} onChange={(e) => setV({ ...v, branch: e.target.value })} />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <label className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium text-muted-foreground">Account number</label>
                <div className="flex-1 min-w-0">
                  <Input value={v.accountNumber} onChange={(e) => setV({ ...v, accountNumber: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          {v.type === "mobile_banking" && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <label className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium text-muted-foreground">Provider</label>
                <div className="flex-1 min-w-0">
                  <Input
                    value={v.provider}
                    onChange={(e) => setV({ ...v, provider: e.target.value })}
                    placeholder="bKash / Nagad / Rocket"
                  />
                </div>
              </div>
              <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                <label className="w-full sm:w-[120px] sm:text-left shrink-0 font-medium text-muted-foreground">Wallet number</label>
                <div className="flex-1 min-w-0">
                  <Input value={v.walletNumber} onChange={(e) => setV({ ...v, walletNumber: e.target.value })} />
                </div>
              </div>
            </div>
          )}
          <div className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-3">
            <label className="w-full sm:w-[120px] sm:text-left shrink-0 pt-2 font-medium">Opening balance (৳)</label>
            <div className="flex-1 min-w-0">
              <Input
                type="number"
                value={v.openingBalance}
                onChange={(e) => setV({ ...v, openingBalance: e.target.value })}
                disabled={!!editing}
              />
              {editing && (
                <p className="text-xs text-muted-foreground mt-1">
                  Opening balance তৈরির পর পরিবর্তন করা যাবে না — adjustment দিন।
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
          <LoadingButton className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={submit} loading={saving}>
            {editing ? "Save Changes" : "Create Account"}
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
