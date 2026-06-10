"use client";

import { AlertTriangle, CheckCircle2, MapPin, Truck } from "lucide-react";
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

  const title = unavailable
    ? "Delivery unavailable"
    : unlocked
      ? "Free delivery unlocked"
      : `Add ${formatCurrency(remaining)} more for free delivery`;

  const helperText = isLocalDelivery
    ? `Free delivery starts above ${formatCurrency(LOCAL_FREE_DELIVERY_THRESHOLD)} within ${LOCAL_FREE_DELIVERY_RADIUS_KM} km.`
    : `Free delivery starts at ${formatCurrency(FREE_DELIVERY_THRESHOLD)} cart value.`;

  return (
    <section
      className={cn(
        "rounded-lg border bg-white p-3 shadow-sm",
        unavailable ? "border-red-200" : unlocked ? "border-emerald-200" : "border-slate-200"
      )}
      aria-label="Delivery fee progress"
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            "grid h-10 w-10 shrink-0 place-items-center rounded-md",
            unavailable ? "bg-red-50 text-red-700" : unlocked ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"
          )}
        >
          {unavailable ? <AlertTriangle className="h-5 w-5" /> : unlocked ? <CheckCircle2 className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-black leading-5 text-slate-950">{title}</h3>
              <p className="mt-0.5 text-xs font-semibold leading-5 text-slate-600">
                {unavailable ? delivery.message : helperText}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-[11px] font-bold uppercase text-slate-400">Fee</p>
              <p className={cn("text-base font-black leading-5", unlocked ? "text-emerald-700" : unavailable ? "text-red-700" : "text-slate-950")}>
                {unavailable ? "-" : delivery.fee === 0 ? "Free" : formatCurrency(delivery.fee)}
              </p>
            </div>
          </div>

          <div className="mt-3" role="progressbar" aria-valuemin={0} aria-valuemax={threshold} aria-valuenow={Math.min(total, threshold)}>
            <div className="flex items-center justify-between gap-3 text-[11px] font-bold text-slate-500">
              <span>{formatCurrency(Math.min(total, threshold))}</span>
              <span>{percent}%</span>
              <span>{formatCurrency(threshold)}</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-200",
                  unavailable ? "bg-red-500" : unlocked ? "bg-emerald-700" : "bg-amber-500"
                )}
                style={{ width: `${unavailable ? 100 : percent}%` }}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <div className="rounded-md bg-slate-50 px-2.5 py-2">
              <p className="font-bold text-slate-500">Cart value</p>
              <p className="mt-0.5 font-black text-slate-950">{formatCurrency(total)}</p>
            </div>
            <div className="rounded-md bg-slate-50 px-2.5 py-2">
              <p className="flex items-center gap-1 font-bold text-slate-500">
                <MapPin className="h-3.5 w-3.5" />
                Distance
              </p>
              <p className="mt-0.5 font-black text-slate-950">{hasDistance ? `${distanceKm.toFixed(2)} km` : "Add address"}</p>
            </div>
          </div>

          {!unlocked && !unavailable ? (
            <p className="mt-3 rounded-md bg-amber-50 px-2.5 py-2 text-xs font-black leading-5 text-amber-900">
              Add {formatCurrency(remaining)} more for FREE delivery{isLocalDelivery ? " within 1.5 km" : ""}.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
