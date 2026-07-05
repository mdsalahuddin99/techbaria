"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronsUpDown, Loader2, Search, X } from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { Input } from "@/shared/ui/input";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/shared/hooks/useDebounce";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/shared/ui/command";

export interface AsyncSuggestOption<T = any> {
  value: string;
  label: string;
  disabled?: boolean;
  description?: string;
  badge?: string;
  raw?: T;
}

interface AsyncSuggestProps<T = any> {
  value: string;
  onValueChange: (value: string) => void;
  fetchOptions: (search: string) => Promise<AsyncSuggestOption<T>[]>;
  defaultOptions?: AsyncSuggestOption<T>[];
  placeholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  allowClear?: boolean;
  autoFocus?: boolean;
  debounceMs?: number;
  openOnFocus?: boolean;
  onSelectObject?: (opt: AsyncSuggestOption<T>) => void;
}

export function AsyncSuggest<T = any>({
  value,
  onValueChange,
  fetchOptions,
  defaultOptions = [],
  placeholder = "Search…",
  emptyMessage = "No results found.",
  disabled,
  className,
  allowClear = false,
  autoFocus,
  debounceMs = 150,
  openOnFocus = true,
  onSelectObject,
}: AsyncSuggestProps<T>) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const blurTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justSelectedRef = useRef(false);

  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, debounceMs);

  const { data: searchResults = [], isFetching } = useQuery({
    queryKey: ["async-suggest", fetchOptions.toString(), debouncedSearch],
    queryFn: () => fetchOptions(debouncedSearch),
    enabled: open && (!justSelectedRef.current),
    staleTime: 1000 * 60 * 5, // 5 mins
  });

  // Combine default options and search results, prioritizing search results
  const allOptions = [
    ...searchResults,
    ...defaultOptions.filter((d) => !searchResults.some((s) => s.value === d.value)),
  ];

  const selected = allOptions.find((o) => o.value === value);

  useEffect(() => {
    if (value && selected) {
      if (document.activeElement !== inputRef.current) {
        setSearchTerm("");
      }
    } else if (!value) {
      setSearchTerm("");
    }
  }, [value, selected?.label]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleFocus = () => {
    if (disabled || justSelectedRef.current) return;
    if (openOnFocus) {
      setOpen(true);
    }
  };

  const handleBlur = () => {
    blurTimerRef.current = setTimeout(() => {
      setOpen(false);
    }, 200);
  };

  const handleSelect = (opt: AsyncSuggestOption) => {
    if (blurTimerRef.current) clearTimeout(blurTimerRef.current);
    if (opt.disabled) return;

    if (allowClear && opt.value === value) {
      onValueChange("");
      onSelectObject?.({ value: "", label: "" });
    } else {
      onValueChange(opt.value);
      onSelectObject?.(opt);
    }
    setSearchTerm("");
    setOpen(false);
    justSelectedRef.current = true;
    inputRef.current?.focus();
    setTimeout(() => { justSelectedRef.current = false; }, 300);
  };

  const handleClear = () => {
    onValueChange("");
    setSearchTerm("");
    setOpen(false);
    inputRef.current?.focus();
  };

  const showDropdown = open && !disabled;
  const hasSearchText = searchTerm.trim().length > 0;
  const displayValue = hasSearchText ? searchTerm : (selected?.label ?? searchTerm);

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          onChange={(e) => {
            const next = e.target.value;
            setSearchTerm(next);
            if (!open) setOpen(true);
            if (!next && value) {
              onValueChange("");
            }
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
          value={displayValue}
          placeholder={placeholder}
          disabled={disabled}
          autoFocus={autoFocus}
          className={cn("pl-9 pr-8", selected && !hasSearchText && "text-foreground font-medium")}
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
          {isFetching && (
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          )}
          {allowClear && value && !hasSearchText && !isFetching && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 rounded hover:bg-accent text-muted-foreground hover:text-foreground"
              tabIndex={-1}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {!isFetching && (
            <ChevronsUpDown className="h-4 w-4 text-muted-foreground pointer-events-none" />
          )}
        </div>
      </div>

      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover text-popover-foreground shadow-md">
          <Command shouldFilter={false}>
            <CommandList>
              {allOptions.length === 0 && !isFetching && (
                <CommandEmpty>{emptyMessage}</CommandEmpty>
              )}
              <CommandGroup>
                {allOptions.map((opt, idx) => (
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
                        <span className="ml-2 shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-medium text-secondary-foreground border border-border">
                          {opt.badge}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </div>
      )}
    </div>
  );
}
