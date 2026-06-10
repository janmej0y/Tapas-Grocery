"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/components/language-provider";
import { cn } from "@/lib/cn";

export function LanguageToggle({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage } = useLanguage();

  return (
    <div className={cn("inline-flex items-center gap-1 rounded-md border border-zinc-100 bg-white p-1", compact ? "" : "shadow-sm")}>
      <Languages className="ml-2 h-4 w-4 text-leaf-700" aria-hidden="true" />
      {(["en", "bn"] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => setLanguage(item)}
          className={cn(
            "rounded px-3 py-1.5 text-sm font-black transition-all duration-150 active:scale-[0.98]",
            language === item ? "bg-leaf-600 text-white" : "text-ink hover:bg-leaf-50"
          )}
          aria-pressed={language === item}
        >
          {item === "en" ? "English" : "বাংলা"}
        </button>
      ))}
    </div>
  );
}
