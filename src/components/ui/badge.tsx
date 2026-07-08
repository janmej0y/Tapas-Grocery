import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "fresh" | "deal" | "warning" | "saved" | "default";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  fresh: "bg-primary-accent/10 text-primary-accent border border-primary-accent/10",
  deal: "bg-secondary-accent/10 text-secondary-accent border border-secondary-accent/15",
  warning: "bg-badge-warning/10 text-badge-warning border border-badge-warning/10",
  saved: "bg-badge-saved/10 text-badge-saved border border-badge-saved/10",
  default: "bg-slate-100 text-slate-600 border border-slate-200"
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider leading-none shadow-sm",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
