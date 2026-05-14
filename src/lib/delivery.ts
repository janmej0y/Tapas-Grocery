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

  if (distanceKm > 0.3 && distanceKm <= 1) {
    const fee = cartTotal > 150 ? 0 : 10;

    return {
      available: true,
      fee,
      message: fee === 0 ? "Free delivery unlocked over ₹150." : "Delivery fee is ₹10 up to 1 km."
    };
  }

  if (distanceKm > 1 && distanceKm <= 2) {
    const fee = cartTotal > 400 ? 0 : 20;

    return {
      available: true,
      fee,
      message: fee === 0 ? "Free delivery unlocked over ₹400." : "Delivery fee is ₹20 up to 2 km."
    };
  }

  return {
    available: false,
    fee: 0,
    message: "Delivery not available outside 2 km."
  };
}
