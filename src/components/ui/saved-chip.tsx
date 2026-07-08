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
        "inline-flex items-center gap-1 rounded-full border border-badge-saved/15 bg-badge-saved/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-badge-saved shadow-card",
        className
      )}
    >
      <MapPin className="h-3.5 w-3.5 shrink-0" />
      {label}
    </span>
  );
}
