import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "dark" | "danger" | "ghost";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary-accent text-white hover:bg-primary-accent/90 disabled:bg-zinc-300 disabled:text-zinc-600",
  secondary: "bg-secondary-accent text-white hover:bg-secondary-accent/90",
  dark: "bg-ink text-white hover:bg-primary-accent disabled:bg-zinc-300 disabled:text-zinc-600",
  danger: "bg-red-700 text-white hover:bg-red-800 disabled:bg-zinc-300 disabled:text-zinc-600",
  ghost: "text-ink hover:bg-primary-accent/10"
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
};

export function Button({ children, className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-sm font-bold transition-all duration-150 ease-in-out active:scale-[0.98] disabled:cursor-not-allowed",
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
