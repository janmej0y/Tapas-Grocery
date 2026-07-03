"use client";

import Link from "next/link";
import Image from "next/image";
import { Minus, Plus, ShoppingCart, Trash2, X } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/components/language-provider";
import { useStore } from "@/components/store-provider";
import { useCartSummary } from "@/hooks/use-cart-summary";
import { formatCurrency } from "@/lib/format";
import { formatCartItemName, getUnitPrice } from "@/lib/units";

export function FloatingCartBar({ hidden = false }: { hidden?: boolean }) {
  const { productName } = useLanguage();
  const { removeFromCart, updateQuantity } = useStore();
  const { cart, itemCount, subtotal } = useCartSummary();
  const [isOpen, setIsOpen] = useState(false);

  if (hidden || itemCount === 0) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 left-4 right-4 z-40 inline-flex items-center justify-between rounded-lg bg-[#15803d] px-4 py-3 font-black text-white shadow-soft transition-all duration-150 hover:bg-emerald-800 active:scale-[0.98] sm:left-auto sm:right-6 sm:w-96"
      >
        <span className="inline-flex items-center gap-2">
          <ShoppingCart className="h-5 w-5" />
          {itemCount} items
        </span>
        <span>{formatCurrency(subtotal)}</span>
        <span>View cart</span>
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-[85] bg-black/40 backdrop-blur-xs" role="presentation" onClick={() => setIsOpen(false)}>
          <aside
            className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-hidden rounded-t-2xl bg-white shadow-soft sm:inset-y-0 sm:left-auto sm:right-0 sm:h-full sm:max-h-none sm:w-[420px] sm:rounded-l-2xl sm:rounded-tr-none"
            role="dialog"
            aria-modal="true"
            aria-label="Cart drawer"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-100 p-4">
              <div>
                <p className="text-xs font-black uppercase text-primary-accent">Your basket</p>
                <h2 className="text-xl font-black text-[#111827]">{itemCount} items ready</h2>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="rounded-md border border-slate-100 p-2 hover:bg-emerald-50/50" aria-label="Close cart drawer">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="max-h-[52vh] overflow-auto p-4 sm:max-h-[calc(100vh-210px)]">
              <div className="space-y-3">
                {cart.map((item) => {
                  const name = productName(item.product.name);
                  const unitPrice = getUnitPrice(item.product.price, item.selectedUnit, item.product.variantPrices);
                  return (
                    <div key={`${item.product.id}-${item.selectedUnit}`} className="grid grid-cols-[56px_1fr] gap-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <Image src={item.product.image_url} alt={name} width={56} height={56} className="aspect-square rounded-md bg-white object-contain p-1" />
                      <div className="min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="truncate font-black text-[#111827]">{formatCartItemName(name, item.selectedUnit)}</p>
                            <p className="text-sm font-semibold text-slate-500">{formatCurrency(unitPrice)} each</p>
                          </div>
                          <button type="button" onClick={() => removeFromCart(item.product.id, item.selectedUnit)} className="rounded-md p-1.5 text-red-700 hover:bg-red-50" aria-label="Remove item">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <button type="button" onClick={() => updateQuantity(item.product.id, item.selectedUnit, item.quantity - 1)} className="rounded-md border border-slate-200 bg-white p-2 hover:bg-emerald-50/50" aria-label="Decrease quantity">
                              <Minus className="h-4 w-4" />
                            </button>
                            <span className="grid h-9 min-w-10 place-items-center rounded-md bg-white px-3 text-sm font-black text-[#111827]">{item.quantity}</span>
                            <button type="button" onClick={() => updateQuantity(item.product.id, item.selectedUnit, item.quantity + 1)} className="rounded-md border border-slate-200 bg-white p-2 hover:bg-emerald-50/50" aria-label="Increase quantity">
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <p className="font-black text-[#15803d]">{formatCurrency(unitPrice * item.quantity)}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-slate-100 bg-white p-4">
              <div className="mb-3 flex items-center justify-between text-lg font-black text-[#111827]">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <Link href="/checkout" onClick={() => setIsOpen(false)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary-accent px-4 py-3 font-black text-white hover:bg-emerald-800 transition active:scale-[0.98]">
                Checkout now
              </Link>
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
