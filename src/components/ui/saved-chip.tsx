import { MapPin } from "lucide-react";
import { cn } from "@/lib/cn";

interface SavedChipProps {
  className?: string;
  label?: string;
}

export function SavedChip({ className, label = "Saved Address" }: SavedChipProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full bg-[#06b6d4]/10 border border-[#06b6d4]/15 px-2.5 py-1 text-xs font-black uppercase tracking-wider text-[#06b6d4] shadow-sm",
        className
      )}
    >
      <MapPin className="h-3 w-3 shrink-0" />
      {label}
    </span>
  );
}
