import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeVariant = "fresh" | "deal" | "warning" | "saved" | "default";

interface BadgeProps {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  fresh: "bg-[#15803d]/10 text-[#15803d] border border-[#15803d]/10",
  deal: "bg-[#f59e0b]/10 text-[#f59e0b] border border-[#f59e0b]/15",
  warning: "bg-[#dc2626]/10 text-[#dc2626] border border-[#dc2626]/10",
  saved: "bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/10",
  default: "bg-slate-100 text-slate-600 border border-slate-200"
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wider leading-none shadow-sm",
        variantStyles[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
