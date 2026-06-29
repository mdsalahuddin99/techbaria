import { ReactNode } from "react";
import { cn } from "@/shared/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Standard page header used across all routes. Keeps spacing,
 * typography and action placement consistent.
 */
export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 md:mb-5",
        "px-4 py-3 rounded-lg bg-[var(--theme-color,hsl(var(--primary)))] shadow-sm border border-[var(--theme-color,hsl(var(--primary)))] page-header-solid text-white transition-all duration-300",
        className
      )}
    >
      <div className="min-w-0 flex items-center gap-2">
        <h1 className="text-lg md:text-xl font-bold tracking-tight text-white whitespace-nowrap">
          {title}
        </h1>
        {description ? (
          <span className="hidden md:inline-block text-[11px] text-white/80 font-medium truncate border-l border-white/20 pl-2">
            {description}
          </span>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0 header-actions">
          {/* We assume actions are small buttons, but we can also inject smaller button styles if we wanted to. */}
          {actions}
        </div>
      ) : null}
    </div>
  );
}
