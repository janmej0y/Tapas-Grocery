import type { InputHTMLAttributes, SelectHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn("w-full rounded-md border border-zinc-100 bg-white px-3 py-2 text-ink transition-all duration-150 focus:border-leaf-600", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn("w-full rounded-md border border-zinc-100 bg-white px-3 py-2 text-ink transition-all duration-150 focus:border-leaf-600", className)}
      {...props}
    />
  );
}
