"use client";

import { useMemo } from "react";
import { useStore } from "@/components/store-provider";
import { getFreeDeliveryProgress } from "@/lib/delivery";
import { getUnitPrice } from "@/lib/units";

export function useCartSummary() {
  const { cart } = useStore();

  return useMemo(() => {
    const itemCount = cart.reduce((total, item) => total + item.quantity, 0);
    const subtotal = cart.reduce(
      (total, item) => total + getUnitPrice(item.product.price, item.selectedUnit, item.product.variantPrices) * item.quantity,
      0
    );

    return {
      cart,
      itemCount,
      subtotal,
      freeDelivery: getFreeDeliveryProgress(subtotal)
    };
  }, [cart]);
}
