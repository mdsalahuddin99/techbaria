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
import { useDebounce } from "@/shared/hooks/useDebounce";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/shared/api-client/fetch";
import { useCustomersQuery } from "@/features/customers/hooks";
import type { Customer } from "@/features/customers/types";

interface CustomerSearchProps {
  initialCustomers?: Customer[];
  selectedCustomerId: string | null;
  onChange: (id: string) => void;
}

/** Searchable customer picker for the POS cart with inline "Add new" action. */
export function CustomerSearch({
  initialCustomers = [],
  selectedCustomerId,
  onChange,
}: CustomerSearchProps) {
  const [open, setOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 150);
  const beforeIdsRef = useRef<Set<string>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: customersData } = useCustomersQuery();
  // Handle case where useCustomersQuery returns a PaginatedResponse or an array
  const fetchedCustomers = customersData
    ? (Array.isArray(customersData) ? customersData : (customersData as any).items)
    : undefined;
  const allCustomers: Customer[] = fetchedCustomers || initialCustomers;

  const filteredCustomers = useMemo(() => {
    let list = allCustomers;
    if (debouncedSearchQuery) {
      const q = debouncedSearchQuery.toLowerCase();
      list = list.filter((c) => 
        c.name.toLowerCase().includes(q) || 
        (c.phone && c.phone.includes(q)) ||
        (c.id === debouncedSearchQuery)
      );
    }
    return list.slice(0, 50);
  }, [allCustomers, debouncedSearchQuery]);

  const selected = useMemo(
    () => filteredCustomers.find((c) => c.id === selectedCustomerId) ?? null,
    [filteredCustomers, selectedCustomerId],
  );



  const handleOpenChange = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setSearchQuery("");
    }
  };

  const handleAddOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      beforeIdsRef.current = new Set(filteredCustomers.map((c) => c.id));
    } else {
      const added = filteredCustomers.find((c) => !beforeIdsRef.current.has(c.id));
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
                placeholder="Select customer..."
                value={
                  open
                    ? searchQuery
                    : selected
                    ? `${selected.name}${selected.phone && selected.phone !== "—" ? ` · ${selected.phone}` : ""}`
                    : ""
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
