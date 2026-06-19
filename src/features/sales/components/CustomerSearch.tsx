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
  const beforeIdsRef = useRef<Set<string>>(new Set());

  const selected = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) ?? null,
    [customers, selectedCustomerId],
  );

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
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={open}
              className="flex-1 min-w-0 justify-between h-11 md:h-10 font-normal"
            >
              <span className="truncate text-left">
                {selected
                  ? `${selected.name}${selected.phone && selected.phone !== "—" ? ` · ${selected.phone}` : ""}`
                  : "Select customer"}
              </span>
              {selected && balanceBadge(selected)}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="p-0 w-[--radix-popover-trigger-width] max-w-[calc(100vw-2rem)]"
            align="start"
          >
            <Command>
              <CommandInput placeholder="Search customer..." />
              <CommandList className="max-h-[60vh]">
                <CommandEmpty>No customer found.</CommandEmpty>
                <CommandGroup>
                  {customers.map((c) => (
                    <CommandItem
                      key={c.id}
                      value={`${c.name} ${c.phone} ${c.email ?? ""}`}
                      onSelect={() => {
                        onChange(c.id);
                        setOpen(false);
                      }}
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
          className="shrink-0 h-11 w-11 md:h-10 md:w-10"
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
