import type { DeliveryResult } from "@/lib/types";

export function calculateDeliveryFee(distanceKm: number, cartTotal: number): DeliveryResult {
  if (!Number.isFinite(distanceKm) || distanceKm < 0) {
    return {
      available: false,
      fee: 0,
      message: "Please enter a valid delivery distance."
    };
  }

  if (distanceKm <= 0.3) {
    return {
      available: true,
      fee: 3,
      message: "Delivery fee is ₹3 within 300 meters."
    };
  }

  if (distanceKm > 20) {
    return {
      available: false,
      fee: 0,
      message: "Delivery not available outside 20 km."
    };
  }

  if (distanceKm <= 1 && cartTotal > 200) {
    return {
      available: true,
      fee: 0,
      message: "Free delivery unlocked over ₹200 within 1 km."
    };
  }

  if (distanceKm <= 2 && cartTotal > 400) {
    return {
      available: true,
      fee: 0,
      message: "Free delivery unlocked over ₹400 within 2 km."
    };
  }

  const extraHundredMeterBlocks = Math.ceil(((distanceKm - 0.3) * 1000) / 100);
  const fee = 3 + Math.max(0, extraHundredMeterBlocks);

  return {
    available: true,
    fee,
    message: `Delivery fee is ₹${fee}. After 300 meters, ₹1 is added for every 100 meters.`
  };
}
