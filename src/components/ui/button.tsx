import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "dark" | "danger" | "ghost" | "outline";
type ButtonShape = "rounded" | "pill";

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-primary-accent text-white hover:bg-primary-accent/90 disabled:bg-zinc-300 disabled:text-zinc-600",
  secondary: "bg-secondary-accent text-white hover:bg-secondary-accent/90 disabled:bg-zinc-300 disabled:text-zinc-600",
  dark: "bg-ink text-white hover:bg-primary-accent disabled:bg-zinc-300 disabled:text-zinc-600",
  danger: "bg-red-700 text-white hover:bg-red-800 disabled:bg-zinc-300 disabled:text-zinc-600",
  ghost: "text-ink hover:bg-primary-accent/10 disabled:text-zinc-400",
  outline: "border border-zinc-200 bg-white text-ink hover:bg-leaf-50 disabled:bg-zinc-100 disabled:text-zinc-400"
};

const shapeClasses: Record<ButtonShape, string> = {
  rounded: "rounded-md",
  pill: "rounded-full"
};

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  variant?: ButtonVariant;
  shape?: ButtonShape;
  loading?: boolean;
  loadingText?: string;
};

export function Button({ children, className, variant = "primary", shape = "rounded", loading = false, loadingText, disabled, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-bold shadow-sm transition-all duration-150 ease-in-out active:scale-[0.98] disabled:cursor-not-allowed",
        shapeClasses[shape],
        variantClasses[variant],
        className
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
