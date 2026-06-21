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
        "flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-5 md:mb-6",
        "px-5 py-4 rounded-lg bg-[var(--theme-color,hsl(var(--primary)))] shadow-md border border-[var(--theme-color,hsl(var(--primary)))] page-header-solid text-white transition-all duration-300",
        className
      )}
    >
      <div className="min-w-0 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
          {title}
        </h1>
        {description ? (
          <span className="text-xs md:text-sm text-white/85 font-normal">
            — {description}
          </span>
        ) : null}
      </div>
      {actions ? (
        <div className="flex flex-wrap items-center gap-2 shrink-0 header-actions">{actions}</div>
      ) : null}
    </div>
  );
}
