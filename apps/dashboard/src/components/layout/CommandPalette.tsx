"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandShortcut,
  CommandSeparator,
} from "@/shared/ui/command";
import {
  Search,
  LayoutDashboard,
  ScanBarcode,
  Package,
  ShoppingCart,
  Users,
  Settings,
  Plus,
  Trash2,
  Percent,
  Filter,
  Truck,
  ArrowUpDown,
  BookOpen,
} from "lucide-react";
import { toast } from "sonner";
import { useProducts } from "@/features/products/hooks";
import { useCustomers } from "@/features/customers/hooks";
import { useSales } from "@/features/sales/hooks";
import { useMemo } from "react";

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  // Fetch lists for global search
  const { data: products = [] } = useProducts();
  const { data: customers = [] } = useCustomers();
  const { data: sales = [] } = useSales();

  // Handle Ctrl+K / Cmd+K keypress and toggle the palette
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  // Listen for custom trigger event (e.g. from header search button clicks)
  useEffect(() => {
    const handleOpen = () => setOpen(true);
    window.addEventListener("cmd:open-palette", handleOpen);
    return () => window.removeEventListener("cmd:open-palette", handleOpen);
  }, []);

  // Clear search query when command palette is closed
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
    }
  }, [open]);

  // Client-side search filters
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase().trim();
    return products
      .filter((p) => {
        const brand = typeof p.brand === "object" && p.brand ? (p.brand as any).name : p.brand;
        const model = typeof p.model === "object" && p.model ? (p.model as any).name : p.model;

        return (
          (p.name || "").toLowerCase().includes(q) ||
          (p.sku || "").toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toLowerCase().includes(q)) ||
          (brand && brand.toLowerCase().includes(q)) ||
          (model && model.toLowerCase().includes(q))
        );
      })
      .slice(0, 5);
  }, [products, searchQuery]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase().trim();
    return customers
      .filter((c) => {
        return (
          (c.name || "").toLowerCase().includes(q) ||
          (c.phone || "").toLowerCase().includes(q) ||
          (c.email && c.email.toLowerCase().includes(q))
        );
      })
      .slice(0, 5);
  }, [customers, searchQuery]);

  const filteredSales = useMemo(() => {
    if (!searchQuery) return [];
    const q = searchQuery.toLowerCase().trim();
    return sales
      .filter((s) => {
        return (
          (s.invoiceNo || "").toLowerCase().includes(q) ||
          (s.customerName || "").toLowerCase().includes(q) ||
          (s.customerPhone && s.customerPhone.toLowerCase().includes(q))
        );
      })
      .slice(0, 5);
  }, [sales, searchQuery]);

  // Run a navigation action
  const navigateTo = (path: string) => {
    setOpen(false);
    router.push(path);
  };

  // Run a context command
  const runCommand = (eventName: string, successMessage?: string) => {
    setOpen(false);
    window.dispatchEvent(new CustomEvent(eventName));
    if (successMessage) {
      toast.success(successMessage);
    }
  };

  // Context-aware checks
  const isPOS = pathname === "/dashboard/sales/create";
  const isSalesList = pathname === "/dashboard/sales";
  const isProducts = pathname === "/dashboard/products";
  const isCustomers = pathname === "/dashboard/customers";
  const isSuppliers = pathname === "/dashboard/suppliers";

  const handleSelectProduct = (product: any) => {
    setOpen(false);
    if (isPOS) {
      window.dispatchEvent(new CustomEvent("cmd:add-product-by-id", { detail: product.id }));
      toast.success(`Added "${product.name}" to cart`);
    } else {
      router.push(`/dashboard/products?search=${encodeURIComponent(product.name)}`);
    }
  };

  const handleSelectCustomer = (customer: any) => {
    setOpen(false);
    if (isPOS) {
      window.dispatchEvent(new CustomEvent("cmd:select-customer-by-id", { detail: customer.id }));
      toast.success(`Selected customer "${customer.name}"`);
    } else {
      router.push(`/dashboard/customers?search=${encodeURIComponent(customer.name)}`);
    }
  };

  const handleSelectSale = (sale: any) => {
    setOpen(false);
    router.push(`/dashboard/sales?search=${encodeURIComponent(sale.invoiceNo)}`);
  };

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput
        placeholder="Type a command or search..."
        value={searchQuery}
        onValueChange={setSearchQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        {/* ── Global Search Results ── */}
        {searchQuery && (
          <>
            {filteredProducts.length > 0 && (
              <CommandGroup heading="Products">
                {filteredProducts.map((p) => {
                  const brand = typeof p.brand === "object" && p.brand ? (p.brand as any).name : p.brand;
                  const model = typeof p.model === "object" && p.model ? (p.model as any).name : p.model;
                  return (
                  <CommandItem
                    key={p.id}
                    value={`product-${p.id}-${p.name}-${p.sku}-${p.barcode || ""}-${brand || ""}-${model || ""}`.toLowerCase()}
                    onSelect={() => handleSelectProduct(p)}
                  >
                    <span className="mr-2 text-lg">{p.emoji || "📦"}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{p.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        SKU: {p.sku} &bull; Barcode: {p.barcode || "—"} &bull; Stock: {p.stock}
                      </p>
                    </div>
                    <span className="ml-2 text-xs font-semibold tabular-nums">
                      ৳{p.price}
                    </span>
                  </CommandItem>
                  );
                })}
              </CommandGroup>
            )}

            {filteredCustomers.length > 0 && (
              <CommandGroup heading="Customers">
                {filteredCustomers.map((c) => (
                  <CommandItem
                    key={c.id}
                    value={`customer-${c.id}-${c.name}-${c.phone}`.toLowerCase()}
                    onSelect={() => handleSelectCustomer(c)}
                  >
                    <Users className="mr-2 h-4 w-4 text-emerald-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{c.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Phone: {c.phone} &bull; Group: {c.group}
                      </p>
                    </div>
                    {c.due && c.due > 0 ? (
                      <span className="ml-2 text-xs font-semibold text-destructive tabular-nums">
                        Due: ৳{c.due}
                      </span>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {filteredSales.length > 0 && (
              <CommandGroup heading="Invoices / Sales">
                {filteredSales.map((s) => (
                  <CommandItem
                    key={s.id}
                    value={`sale-${s.id}-${s.invoiceNo}-${s.customerName}`.toLowerCase()}
                    onSelect={() => handleSelectSale(s)}
                  >
                    <ShoppingCart className="mr-2 h-4 w-4 text-indigo-500" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{s.invoiceNo}</p>
                      <p className="text-[11px] text-muted-foreground truncate">
                        Customer: {s.customerName} &bull; Method: {s.paymentMethod}
                      </p>
                    </div>
                    <span className="ml-2 text-xs font-semibold tabular-nums">
                      ৳{s.total}
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            <CommandSeparator />
          </>
        )}

        {/* ── Context-Specific Quick Actions ── */}
        {isPOS && (
          <CommandGroup heading="Active Page: POS / Sale Create">
            <CommandItem onSelect={() => runCommand("cmd:focus-product-search")}>
              <Search className="mr-2 h-4 w-4 text-primary" />
              <span>Search / Scan Products</span>
              <CommandShortcut>Shortcut: Esc/Enter</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => runCommand("cmd:focus-customer-search")}>
              <Users className="mr-2 h-4 w-4 text-emerald-600" />
              <span>Select Customer</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand("cmd:quick-discount")}>
              <Percent className="mr-2 h-4 w-4 text-amber-500" />
              <span>Add Discount to First Item</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand("cmd:clear-cart", "Cart cleared")}
              className="text-destructive data-[selected=true]:bg-destructive/10 data-[selected=true]:text-destructive"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              <span>Clear Cart</span>
            </CommandItem>
          </CommandGroup>
        )}

        {isSalesList && (
          <CommandGroup heading="Active Page: Sales History">
            <CommandItem onSelect={() => runCommand("cmd:focus-invoice-search")}>
              <Search className="mr-2 h-4 w-4 text-primary" />
              <span>Search Invoice / Customer</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand("cmd:filter-unpaid")}>
              <ArrowUpDown className="mr-2 h-4 w-4 text-amber-500" />
              <span>Filter: Unpaid Dues First</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand("cmd:filter-completed")}>
              <Filter className="mr-2 h-4 w-4 text-emerald-500" />
              <span>Filter: All Completed (Newest)</span>
            </CommandItem>
          </CommandGroup>
        )}

        {isProducts && (
          <CommandGroup heading="Active Page: Products Catalog">
            <CommandItem onSelect={() => runCommand("cmd:focus-product-search")}>
              <Search className="mr-2 h-4 w-4 text-primary" />
              <span>Search Product / SKU</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand("cmd:add-product")}>
              <Plus className="mr-2 h-4 w-4 text-emerald-600" />
              <span>Add New Product</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand("cmd:filter-low-stock")}>
              <Filter className="mr-2 h-4 w-4 text-amber-500" />
              <span>Toggle Low Stock Alert Filter</span>
            </CommandItem>
          </CommandGroup>
        )}

        {isCustomers && (
          <CommandGroup heading="Active Page: Customers Directory">
            <CommandItem onSelect={() => runCommand("cmd:focus-customer-search")}>
              <Search className="mr-2 h-4 w-4 text-primary" />
              <span>Search Customers by Name/Phone</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand("cmd:add-customer")}>
              <Plus className="mr-2 h-4 w-4 text-emerald-600" />
              <span>Add New Customer</span>
            </CommandItem>
          </CommandGroup>
        )}

        {isSuppliers && (
          <CommandGroup heading="Active Page: Suppliers Directory">
            <CommandItem onSelect={() => runCommand("cmd:focus-supplier-search")}>
              <Search className="mr-2 h-4 w-4 text-primary" />
              <span>Search Suppliers by Name/Phone</span>
            </CommandItem>
            <CommandItem onSelect={() => runCommand("cmd:add-supplier")}>
              <Plus className="mr-2 h-4 w-4 text-emerald-600" />
              <span>Add New Supplier</span>
            </CommandItem>
          </CommandGroup>
        )}

        {/* Separator if context-specific items were shown */}
        {(isPOS || isSalesList || isProducts || isCustomers || isSuppliers) && (
          <CommandSeparator />
        )}

        {/* ── General Navigation ── */}
        <CommandGroup heading="General Navigation">
          <CommandItem onSelect={() => navigateTo("/dashboard")}>
            <LayoutDashboard className="mr-2 h-4 w-4 text-slate-500" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo("/dashboard/sales/create")}>
            <ScanBarcode className="mr-2 h-4 w-4 text-slate-500" />
            <span>POS (Create Sale)</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo("/dashboard/products")}>
            <Package className="mr-2 h-4 w-4 text-slate-500" />
            <span>Products</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo("/dashboard/sales")}>
            <ShoppingCart className="mr-2 h-4 w-4 text-slate-500" />
            <span>Sales History</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo("/dashboard/customers")}>
            <Users className="mr-2 h-4 w-4 text-slate-500" />
            <span>Customers</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo("/dashboard/suppliers")}>
            <Truck className="mr-2 h-4 w-4 text-slate-500" />
            <span>Suppliers</span>
          </CommandItem>
          <CommandItem onSelect={() => navigateTo("/dashboard/settings")}>
            <Settings className="mr-2 h-4 w-4 text-slate-500" />
            <span>Settings</span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
