"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { useSearchHandler } from "@/shared/hooks/use-search-handler";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";

export interface AutoSuggestOption {
  value: string;
  label: string;
  disabled?: boolean;
  /** Optional sub-text shown below the label */
  description?: string;
  /** Optional badge text shown on the right (e.g. stock count) */
  badge?: string;
}

interface AutoSuggestProps {
  value: string;
  onValueChange: (value: string) => void;
  options: AutoSuggestOption[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  autoFocus?: boolean;
  /** Debounce delay in ms (default: 200) */
  debounceMs?: number;
  /**
   * Allow free-text input in addition to selecting from suggestions.
   * When true, typing and blurring will set value to whatever was typed,
   * even if no suggestion was selected.
   */
  allowFreeText?: boolean;
}

/**
 * Auto-suggest / autocomplete input.
 *
 * টাইপ করার সাথে সাথে ড্রপডাউন ওপেন হবে এবং
 * Arrow keys + Enter দিয়ে সিলেক্ট করা যাবে।
 *
 * ```tsx
 * <AutoSuggest
 *   value={supplierId}
 *   onValueChange={setSupplierId}
 *   options={suppliers.map(s => ({ value: s.id, label: s.name }))}
 *   placeholder="Search supplier…"
 * />
 * ```
 */
export function AutoSuggest({
  value,
  onValueChange,
  options,
  placeholder = "Search…",
  emptyMessage = "No results found.",
  disabled,
  className,
  allowClear = false,
  autoFocus,
  debounceMs = 200,
  allowFreeText = false,
}: AutoSuggestProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelectedRef = useRef(false);

  const selected = options.find((o) => o.value === value);

  // ── useSearchHandler for debounced filtering ─────────────────────────
  const {
    searchTerm,
    setSearchTerm,
    results,
    isSearching,
    isEmpty,
    clearSearch,
  } = useSearchHandler(
    {
      mode: "client",
      data: options,
      fields: ["label", "description"],
    },
    debounceMs,
  );

  // ── When parent value changes externally, sync UI ────────────────────
  useEffect(() => {
    if (value && selected) {
      // Only update if the input is not focused (user is not typing)
      if (document.activeElement !== inputRef.current) {
        setSearchTerm("");
      }
    } else if (!value) {
      setSearchTerm("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, selected?.label]);

  // ── Close on click outside ───────────────────────────────────────────
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ── Handlers ─────────────────────────────────────────────────────────
  const handleFocus = () => {
    if (disabled || justSelectedRef.current) return;
    setOpen(true);
  };

  const handleBlur = () => {
    // For free-text mode, commit whatever was typed on blur
    const typed = searchTerm.trim();
    if (allowFreeText && typed && !selected) {
      onValueChange(typed);
      clearSearch();
    }
    // Delay hiding dropdown so click on item registers first
    blurTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  const handleSelect = (opt: AutoSuggestOption) => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    if (opt.disabled) return;

    if (allowClear && opt.value === value) {
      onValueChange("");
    } else {
      onValueChange(opt.value);
    }
    clearSearch();
    setOpen(false);
    justSelectedRef.current = true;
    inputRef.current?.focus();
    // Reset the flag after a short delay so next normal focus re-opens dropdown.
    setTimeout(() => { justSelectedRef.current = false; }, 300);
  };

  const handleClear = () => {
    onValueChange("");
    clearSearch();
    setOpen(false);
    inputRef.current?.focus();
  };

  const showDropdown = open && !disabled;
  const hasSearchText = searchTerm.trim().length > 0;

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      {/* ── Input ─────────────────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          onChange={(e) => {
            const next = e.target.value;
            setSearchTerm(next);
            if (!open) setOpen(true);
            // When user clears the input entirely, also clear the committed value
            if (!next && value) {
              onValueChange("");
            }
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          value={hasSearchText ? searchTerm : (selected?.label ?? (allowFreeText ? value : searchTerm))}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn("pl-9 pr-8", selected && !hasSearchText && "text-foreground font-medium")}
        />
        {/* Right icon: clear or chevron */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {isSearching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {allowClear && value && !hasSearchText && !isSearching && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {!isSearching && (
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground pointer-events-none" />
          )}
        </div>
      </div>

      {/* ── Dropdown ──────────────────────────────────────────────── */}
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <Command shouldFilter={false}>
            <CommandList>
              {hasSearchText && isEmpty && !isSearching && (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              )}
              <CommandGroup>
                {results.map((opt, idx) => (
                  <CommandItem
                    key={`${opt.value}-${idx}`}
                    value={opt.value}
                    disabled={opt.disabled}
                    onSelect={() => handleSelect(opt)}
                    className={cn(
                      "cursor-pointer",
                      opt.value === value && "bg-accent/50",
                    )}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        opt.value === value ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <div className="flex flex-1 items-center justify-between min-w-0">
                      <div className="flex flex-col min-w-0">
                        <span className="truncate">{opt.label}</span>
                        {opt.description && (
                          <span className="text-[11px] text-muted-foreground truncate">
                            {opt.description}
                          </span>
                        )}
                      </div>
                      {opt.badge && (
                        <span className="shrink-0 ml-2 text-[11px] font-medium text-muted-foreground">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
                {results.length === 0 && !hasSearchText && (
                  <div className="py-6 text-center text-sm text-muted-foreground">
                    {options.length > 0
                      ? "Type to search…"
                      : "No options available"}
                  </div>
                )}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
