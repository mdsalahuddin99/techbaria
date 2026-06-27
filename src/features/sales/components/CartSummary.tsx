import { useState } from "react";
import { Input } from "@/shared/ui/input";
import { Button } from "@/shared/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/shared/ui/popover";
import {
  Receipt,
  Plus,
  Minus,
  X,
  Pause,
  Keyboard,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDateTime } from "@/shared/lib/format";
import { CustomerSearch } from "./CustomerSearch";
import type { CartItem, Customer } from "@/shared/lib/types";

interface HeldSaleSummary {
  id: string;
  customerName: string;
  cart: CartItem[];
  heldAt: string;
}

interface CartSummaryProps {
  cart: CartItem[];
  customers: Customer[];
  selectedCustomerId: string | null;
  onSelectCustomer: (id: string) => void;
  discount: number;
  onDiscountChange: (amount: number) => void;
  subtotal: number;
  discountAmt: number;
  total: number;
  heldSales: HeldSaleSummary[];
  heldOpen: boolean;
  onHeldOpenChange: (open: boolean) => void;
  onHold: () => void;
  onResumeHeld: (id: string) => void;
  onDeleteHeld: (id: string) => void;
  onClear: () => void;
  onIncrement: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
  onSetWarranty: (productId: string, months: number | undefined) => void;
  onSetSerials: (productId: string, serials: string[]) => void;
  onCheckout: () => void;
  onShowHelp: () => void;
}

/** Right-side cart panel: customer + items + totals + checkout CTA. */
export function CartSummary({
  cart,
  customers,
  selectedCustomerId,
  onSelectCustomer,
  discount,
  onDiscountChange,
  subtotal,
  discountAmt,
  total,
  heldSales,
  heldOpen,
  onHeldOpenChange,
  onHold,
  onResumeHeld,
  onDeleteHeld,
  onClear,
  onIncrement,
  onRemove,
  onSetWarranty,
  onSetSerials,
  onCheckout,
  onShowHelp,
}: CartSummaryProps) {
  const [discountMode, setDiscountMode] = useState<"amount" | "percent">("percent");
  const percentValue = subtotal > 0 ? (discount / subtotal) * 100 : 0;
  return (
    <>
      <div className="p-2 sm:p-3 border-b">
        <div className="flex items-center justify-between mb-1.5 gap-2">
          <h3 className="font-semibold text-sm">Cart</h3>
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={onShowHelp}
              title="Keyboard shortcuts (?)"
              className="h-8 w-8 p-0 hidden sm:inline-flex"
            >
              <Keyboard className="h-4 w-4" />
            </Button>
            <Popover open={heldOpen} onOpenChange={onHeldOpenChange}>
              <PopoverTrigger asChild>
                <Button size="sm" variant="ghost" title="Held sales" className="h-8 px-2 text-xs">
                  Held
                  {heldSales.length > 0 && (
                    <span className="ml-1 px-1.5 rounded-full bg-primary/15 text-primary text-[10px] font-semibold">
                      {heldSales.length}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-2">
                {heldSales.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-3 text-center">No held sales</p>
                ) : (
                  <ul className="max-h-72 overflow-y-auto space-y-1">
                    {heldSales.map((h) => (
                      <li key={h.id} className="flex items-center gap-2 p-2 rounded-md hover:bg-secondary/60">
                        <button
                          type="button"
                          className="flex-1 min-w-0 text-left"
                          onClick={() => onResumeHeld(h.id)}
                        >
                          <p className="text-sm font-medium truncate">{h.customerName}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {h.cart.reduce((s, i) => s + i.qty, 0)} items · {formatDateTime(h.heldAt)}
                          </p>
                        </button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive shrink-0"
                          onClick={() => onDeleteHeld(h.id)}
                          title="Discard"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </PopoverContent>
            </Popover>
            {cart.length > 0 && (
              <>
                <Button size="sm" variant="ghost" onClick={onHold} title="Hold sale (Ctrl+H)" className="h-8 px-2 text-xs">
                  <Pause className="h-3.5 w-3.5 mr-1" />
                  Hold
                </Button>
                <Button size="sm" variant="ghost" onClick={onClear} className="h-8 px-2 text-xs">
                  Clear
                </Button>
              </>
            )}
          </div>
        </div>
        <CustomerSearch
          initialCustomers={customers}
          selectedCustomerId={selectedCustomerId}
          onChange={onSelectCustomer}
        />
      </div>

      <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1.5 min-h-[120px]">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground py-10">
            <Receipt className="h-10 w-10 mb-2 opacity-40" />
            <p className="text-sm">Cart is empty</p>
            <p className="text-xs">Tap products or scan to add</p>
          </div>
        ) : (
          cart.map((item) => (
            <div key={item.productId} className="flex flex-col gap-1.5 p-2 rounded-md bg-secondary/50">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{item.name}</p>
                  {item.serials && item.serials.length > 0 && item.qty > 0 && (
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {item.serials.slice(0, item.qty).map((s, i) => (
                        <span key={i} className="inline-flex items-center gap-0.5 text-[10px] font-mono text-primary/80 bg-primary/5 px-1.5 py-0.5 rounded">
                          #{s}
                          <button
                            type="button"
                            className="hover:text-destructive transition-colors"
                            onClick={() => {
                              const next = item.serials!.filter((_, idx) => idx !== i);
                              onSetSerials(item.productId, next);
                              // Also decrease qty by 1 to stay in sync
                              if (item.qty > 1) {
                                onIncrement(item.productId, item.qty - 1);
                              } else {
                                onRemove(item.productId);
                              }
                            }}
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {formatCurrency(item.price)} × {item.qty} ={" "}
                    <span className="font-semibold text-foreground">
                      {formatCurrency(item.price * item.qty)}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => onIncrement(item.productId, item.qty - 1)}>
                    <Minus className="h-3.5 w-3.5" />
                  </Button>
                  <span className="w-7 text-center text-sm font-medium">{item.qty}</span>
                  <Button size="icon" variant="outline" className="h-9 w-9" onClick={() => onIncrement(item.productId, item.qty + 1)}>
                    <Plus className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-9 w-9 text-destructive" onClick={() => onRemove(item.productId)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-1.5 pl-1">
                <ShieldCheck className="h-3.5 w-3.5 text-primary/70" />
                <label className="text-[11px] text-muted-foreground">ওয়ারেন্টি</label>
                <Input
                  type="number"
                  min={0}
                  value={item.warrantyMonths ?? ""}
                  onChange={(e) => {
                    const v = e.target.value === "" ? undefined : Math.max(0, Number(e.target.value));
                    onSetWarranty(item.productId, v);
                  }}
                  placeholder="0"
                  className="h-7 w-16 text-xs"
                />
                <span className="text-[11px] text-muted-foreground">মাস</span>
                {(item.warrantyMonths ?? 0) > 0 && (
                  <span className="text-[11px] text-accent ml-auto">
                    শেষ: {new Date(new Date().setMonth(new Date().getMonth() + (item.warrantyMonths ?? 0))).toLocaleDateString("en-GB")}
                  </span>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      <div className="border-t p-2 sm:p-3 space-y-2 bg-muted/30">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">
            Discount {discountMode === "percent" ? "(%)" : "(৳)"}
          </span>
          <div className="flex items-center gap-1">
            <div className="flex rounded-md border overflow-hidden">
              <button
                type="button"
                onClick={() => setDiscountMode("percent")}
                className={`px-2 h-9 text-xs font-medium ${discountMode === "percent" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setDiscountMode("amount")}
                className={`px-2 h-9 text-xs font-medium ${discountMode === "amount" ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
              >
                ৳
              </button>
            </div>
            {discountMode === "percent" ? (
              <Input
                type="number"
                min={0}
                max={100}
                value={percentValue ? Number(percentValue.toFixed(2)) : ""}
                onChange={(e) => {
                  const pct = Math.min(100, Math.max(0, Number(e.target.value) || 0));
                  onDiscountChange(Math.round(((subtotal * pct) / 100) * 100) / 100);
                }}
                className="w-20 h-9 text-right"
                placeholder="0"
              />
            ) : (
              <Input
                type="number"
                value={discount || ""}
                onChange={(e) => onDiscountChange(Number(e.target.value))}
                className="w-24 h-9 text-right"
                placeholder="0"
              />
            )}
          </div>
        </div>
        <div className="space-y-1.5 text-sm">
          <CartRow label="Subtotal" value={formatCurrency(subtotal)} />
          <CartRow
            label={`Discount${discountMode === "percent" && percentValue ? ` (${percentValue.toFixed(2)}%)` : ""}`}
            value={`- ${formatCurrency(discountAmt)}`}
          />
          <div className="border-t pt-2 mt-2 flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="text-primary">{formatCurrency(total)}</span>
          </div>
        </div>
        <Button
          className="w-full bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 h-12 text-base"
          onClick={onCheckout}
          disabled={cart.length === 0}
          title="Checkout (F9 / Ctrl+Enter)"
        >
          Checkout · {formatCurrency(total)}
        </Button>
      </div>
    </>
  );
}

export function CartRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
