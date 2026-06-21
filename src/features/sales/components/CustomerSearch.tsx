import { useMemo, useRef, useState } from "react";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";
import { Check, ChevronsUpDown, UserPlus } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { formatCurrency } from "@/shared/lib/format";
import { CustomerFormDialog } from "@/features/customers/CustomerFormDialog";
import type { Customer } from "@/shared/lib/types";

interface CustomerSearchProps {
  customers: Customer[];
  selectedCustomerId: string | null;
  onChange: (id: string) => void;
}

/** Searchable customer picker for the POS cart with inline "Add new" action. */
export function CustomerSearch({
  customers,
  selectedCustomerId,
  onChange,
}: CustomerSearchProps) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const beforeIdsRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const selected = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers.slice(0, 50);

    const qDigits = q.replace(/\D/g, "");

    return customers
      .filter((c) => {
        // 1. Name Match
        if (c.name.toLowerCase().includes(q)) return true;

        // 2. Phone Match (Robust digit-only comparison + partial lookup)
        if (c.phone) {
          const cDigits = c.phone.replace(/\D/g, "");
          if (qDigits && (cDigits.includes(qDigits) || qDigits.includes(cDigits))) {
            return true;
          }
          if (c.phone.toLowerCase().includes(q)) return true;
        }

        // 3. Address Match
        if (c.address && c.address.toLowerCase().includes(q)) return true;

        // 4. Email Match
        if (c.email && c.email.toLowerCase().includes(q)) return true;

        // 5. Invoice Number Match
        if (c.sales && c.sales.some((s) => s.invoiceNo.toLowerCase().includes(q))) return true;

        return false;
      })
      .slice(0, 50);
  }, [customers, searchQuery]);

  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchQuery("");
    }
  };

  const handleAddOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      beforeIdsRef.current = new Set(customers.map((c) => c.id));
    } else {
      const added = customers.find((c) => !beforeIdsRef.current.has(c.id));
      if (added) onChange(added.id);
    }
    setAddOpen(isOpen);
  };

  /** Render a balance badge for a customer. */
  const balanceBadge = (c: Customer) => {
    const adv = c.balance ?? 0;
    const d = c.due ?? 0;
    if (d > 0)
      return <Badge variant="outline" className="border-warning text-warning text-[10px] ml-auto shrink-0">{formatCurrency(d)}</Badge>;
    if (adv > 0)
      return <Badge variant="secondary" className="bg-emerald-100 text-emerald-700 text-[10px] ml-auto shrink-0">Adv {formatCurrency(adv)}</Badge>;
    return null;
  };

  return (
    <>
      <div className="flex items-center gap-2">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger asChild>
            <div className="flex-1 relative">
              <input
                ref={inputRef}
                id="pos-customer-search-btn"
                type="text"
                className="w-full h-10 px-3 py-2 text-sm bg-background border border-input rounded-[4px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                placeholder="Search customer by name/phone..."
                value={
                  open
                    ? searchQuery
                    : selected
                    ? `${selected.name}${selected.phone && selected.phone !== "—" ? ` · ${selected.phone}` : ""}`
                    : "Walk-in Customer"
                }
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setOpen(true);
                }}
                onFocus={() => {
                  setOpen(true);
                  setSearchQuery("");
                }}
              />
            </div>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-[--radix-popover-trigger-width] max-w-[calc(100vw-2rem)]"
            align="start"
            onOpenAutoFocus={(e) => {
              e.preventDefault();
            }}
          >
            <Command shouldFilter={false}>
              <CommandList className="max-h-[50vh]">
                <CommandEmpty>No customer found.</CommandEmpty>
                <CommandGroup>
                  <CommandItem
                    value="Walk-in Customer"
                    onSelect={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        !selected ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="truncate flex-1 font-semibold text-slate-700">
                      Walk-in Customer
                    </span>
                  </CommandItem>
                  {filteredCustomers.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.phone} ${c.email ?? ""}`}
                      onSelect={() => {
                        onChange(c.id);
                        setOpen(false);
                      }}
                      className="cursor-pointer"
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          selected?.id === c.id ? "opacity-100" : "opacity-0",
                        )}
                      />
                      <span className="truncate flex-1">
                        {c.name}
                        {c.phone && c.phone !== "—" && (
                          <span className="text-muted-foreground"> · {c.phone}</span>
                        )}
                      </span>
                      {balanceBadge(c)}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="shrink-0 h-10 w-10"
          onClick={() => handleAddOpenChange(true)}
          title="Add new customer"
          aria-label="Add new customer"
        >
          <UserPlus className="h-4 w-4" />
        </Button>
      </div>
      <CustomerFormDialog
        open={addOpen}
        onOpenChange={handleAddOpenChange}
        editing={null}
      />
    </>
  );
}
