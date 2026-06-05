import * as React from "react";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; positive?: boolean };
  icon?: React.ReactNode;
  /** Highlighted dark card (the Prodexa "today" treatment) */
  featured?: boolean;
  className?: string;
}

export function KpiCard({ label, value, delta, icon, featured, className }: KpiCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] border p-4 transition-shadow",
        featured
          ? "bg-sidebar text-white border-transparent shadow-[var(--shadow)]"
          : "bg-card border-border shadow-[var(--shadow-xs)] hover:shadow-[var(--shadow-sm)]",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <span className={cn("text-xs font-medium", featured ? "text-white/60" : "text-muted-foreground")}>
          {label}
        </span>
        {icon && (
          <span className={cn("flex size-7 items-center justify-center rounded-lg",
            featured ? "bg-white/10 text-teal-300" : "bg-accent text-primary")}>
            {icon}
          </span>
        )}
      </div>
      <div className={cn("mt-2 text-2xl font-bold tracking-tight", featured ? "text-white" : "text-ink")}>
        {value}
      </div>
      {delta && (
        <div className={cn("mt-1 text-xs font-medium",
          delta.positive ? "text-success" : "text-danger")}>
          {delta.positive ? "▲" : "▼"} {delta.value}
        </div>
      )}
    </div>
  );
}
