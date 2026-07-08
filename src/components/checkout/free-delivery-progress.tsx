"use client";

import { motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Truck } from "lucide-react";
import { useCartSummary } from "@/hooks/use-cart-summary";
import { cn } from "@/lib/cn";
import { calculateDeliveryFee, FREE_DELIVERY_THRESHOLD, LOCAL_FREE_DELIVERY_RADIUS_KM, LOCAL_FREE_DELIVERY_THRESHOLD } from "@/lib/delivery";
import { formatCurrency } from "@/lib/format";

export function FreeDeliveryProgress({ cartTotal, distanceKm }: { cartTotal?: number; distanceKm?: number }) {
  const { subtotal } = useCartSummary();
  const total = Math.round(cartTotal ?? subtotal);
  const hasDistance = typeof distanceKm === "number" && Number.isFinite(distanceKm);
  const delivery = calculateDeliveryFee(hasDistance ? distanceKm : 0, total);
  const localFreeTarget = LOCAL_FREE_DELIVERY_THRESHOLD + 1;
  const isLocalDelivery = hasDistance && distanceKm <= LOCAL_FREE_DELIVERY_RADIUS_KM;
  const threshold = isLocalDelivery ? localFreeTarget : FREE_DELIVERY_THRESHOLD;
  const remaining = Math.max(0, threshold - total);
  const percent = Math.min(100, Math.round((total / threshold) * 100));
  const unlocked = delivery.available && delivery.fee === 0;
  const unavailable = hasDistance && !delivery.available;
  const message = unavailable
    ? delivery.message
    : unlocked
      ? "Free delivery unlocked for this order."
      : `Add ${formatCurrency(remaining)} more to unlock FREE delivery.`;

  return (
    <motion.section
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.28, ease: "easeOut" }}
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-card sm:p-5",
        unavailable ? "border-red-100" : unlocked ? "border-leaf-100" : "border-zinc-200"
      )}
      aria-label="Delivery fee progress"
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            "grid h-12 w-12 shrink-0 place-items-center rounded-full",
            unavailable ? "bg-red-50 text-red-700" : unlocked ? "bg-leaf-50 text-primary-accent" : "bg-slate-50 text-ink/70"
          )}
        >
          {unavailable ? <AlertTriangle className="h-5 w-5" /> : unlocked ? <CheckCircle2 className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-ink">Free Delivery Progress</h2>
              <p className={cn("mt-1 text-sm font-semibold", unavailable ? "text-red-700" : "text-primary-accent")}>{message}</p>
            </div>
            <p className="shrink-0 text-sm font-bold text-ink">
              {formatCurrency(Math.min(total, threshold))} / {formatCurrency(threshold)}
            </p>
          </div>

          <div className="mt-4" role="progressbar" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={Math.min(total, threshold)}>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${unavailable ? 100 : percent}%` }}
                transition={{ duration: 0.38, ease: "easeOut" }}
                className={cn("h-full rounded-full", unavailable ? "bg-red-500" : "bg-primary-accent")}
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs font-medium text-slate-500">
            <span>{hasDistance ? `${distanceKm.toFixed(2)} km from store` : "Add address for exact delivery fee"}</span>
            <span>{unavailable ? "Unavailable" : delivery.fee === 0 ? "Free delivery" : `${formatCurrency(delivery.fee)} delivery charge`}</span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}
