import { promoCodes } from "@/lib/mock-data";
import type { PromoCode } from "@/lib/types";

export type PromoResult =
  | {
      valid: true;
      promo: PromoCode;
      discount: number;
      message: string;
    }
  | {
      valid: false;
      discount: 0;
      message: string;
    };

export function applyPromoCode(code: string, cartTotal: number): PromoResult {
  const normalizedCode = code.trim().toUpperCase();

  if (!normalizedCode) {
    return {
      valid: false,
      discount: 0,
      message: "Enter a promo code."
    };
  }

  const promo = promoCodes.find((item) => item.code === normalizedCode && item.active);

  if (!promo) {
    return {
      valid: false,
      discount: 0,
      message: "Promo code is invalid or expired."
    };
  }

  if (cartTotal < promo.minCartTotal) {
    return {
      valid: false,
      discount: 0,
      message: `Add ₹${promo.minCartTotal - cartTotal} more to use ${promo.code}.`
    };
  }

  const discount = promo.type === "percentage" ? Math.floor((cartTotal * promo.value) / 100) : promo.value;

  return {
    valid: true,
    promo,
    discount: Math.min(discount, cartTotal),
    message: `${promo.code} applied.`
  };
}
