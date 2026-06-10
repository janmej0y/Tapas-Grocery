import type { DeliveryResult } from "@/lib/types";

export const FREE_DELIVERY_THRESHOLD = 499;
export const LOCAL_FREE_DELIVERY_THRESHOLD = 299;
export const LOCAL_FREE_DELIVERY_RADIUS_KM = 1.5;
export const MAX_DELIVERY_DISTANCE_KM = 20;
export const STORE_RADIUS_KM = 0.3;

export function calculateDeliveryFee(distanceKm: number, cartTotal: number): DeliveryResult {
  const normalizedDistance = normalizeDistance(distanceKm);
  const normalizedCartTotal = normalizeMoney(cartTotal);

  if (normalizedDistance === null) {
    return {
      available: false,
      fee: 0,
      message: "Please enter a valid delivery distance."
    };
  }

  if (normalizedDistance > MAX_DELIVERY_DISTANCE_KM) {
    return {
      available: false,
      fee: 0,
      message: "Delivery is available within 20 km from Tapas Grocery Store."
    };
  }

  if (normalizedCartTotal >= FREE_DELIVERY_THRESHOLD) {
    return {
      available: true,
      fee: 0,
      message: "Free delivery unlocked."
    };
  }

  if (normalizedDistance <= LOCAL_FREE_DELIVERY_RADIUS_KM && normalizedCartTotal > LOCAL_FREE_DELIVERY_THRESHOLD) {
    return {
      available: true,
      fee: 0,
      message: "Free delivery unlocked for orders above Rs 299 within 1.5 km."
    };
  }

  if (normalizedDistance <= STORE_RADIUS_KM) {
    return {
      available: true,
      fee: 3,
      message: "Delivery fee is Rs 3 within 300 meters."
    };
  }

  const extraHundredMeterBlocks = Math.ceil(((normalizedDistance - STORE_RADIUS_KM) * 1000) / 100);
  const fee = 3 + Math.max(0, extraHundredMeterBlocks);
  const progress = getFreeDeliveryProgress(normalizedCartTotal);
  const localRemaining =
    normalizedDistance <= LOCAL_FREE_DELIVERY_RADIUS_KM
      ? Math.max(0, LOCAL_FREE_DELIVERY_THRESHOLD + 1 - normalizedCartTotal)
      : null;

  return {
    available: true,
    fee,
    message:
      localRemaining !== null && localRemaining > 0
        ? `Delivery fee is Rs ${fee}. Add Rs ${localRemaining} more for Free Delivery within 1.5 km.`
        : `Delivery fee is Rs ${fee}. Add Rs ${progress.remaining} more for Free Delivery.`
  };
}

export function getFreeDeliveryProgress(cartTotal: number) {
  const total = normalizeMoney(cartTotal);
  const remaining = Math.max(0, FREE_DELIVERY_THRESHOLD - total);
  const percent = Math.min(100, Math.round((total / FREE_DELIVERY_THRESHOLD) * 100));

  return {
    threshold: FREE_DELIVERY_THRESHOLD,
    remaining,
    percent,
    unlocked: remaining === 0
  };
}

function normalizeDistance(distanceKm: number) {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return null;
  }

  return Number(distanceKm.toFixed(2));
}

function normalizeMoney(value: number) {
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }

  return Math.round(value);
}
