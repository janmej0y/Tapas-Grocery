"use client";

import Image from "next/image";
import Link from "next/link";
import { Heart, Minus, Plus, ShoppingBasket, Star } from "lucide-react";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/language-provider";
import { useStore } from "@/components/store-provider";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";
import { getUnitPrice } from "@/lib/units";
import { Badge } from "@/components/ui/badge";

export function ProductCard({ product }: { product: Product }) {
  const { productName, t } = useLanguage();
  const { addToCart, cart, customer, toggleFavoriteProduct, updateQuantity } = useStore();
  const [selectedUnit, setSelectedUnit] = useState(product.unitOptions[0]);
  const [imageReady, setImageReady] = useState(false);
  const [justAdded, setJustAdded] = useState(false);

  const displayName = productName(product.name);
  const unitPrice = getUnitPrice(product.price, selectedUnit, product.variantPrices);
  const cartLine = cart.find((item) => item.product.id === product.id && item.selectedUnit === selectedUnit);
  const cartQuantity = cartLine?.quantity ?? 0;
  const isFavorite = customer.favoriteProductIds.includes(product.id);
  const isOutOfStock = product.stock <= 0;
  const isLowStock = !isOutOfStock && product.stock <= (product.minStock ?? 10);
  const hasOffer = Object.keys(product.variantPrices).length > 1;
  const averageRating = useMemo(
    () => product.reviews.length ? product.reviews.reduce((total, review) => total + review.rating, 0) / product.reviews.length : 0,
    [product.reviews]
  );

  function addOne() {
    if (isOutOfStock) {
      return;
    }

    if (cartQuantity > 0) {
      updateQuantity(product.id, selectedUnit, Math.min(product.stock, cartQuantity + 1));
      return;
    }

    addToCart(product, selectedUnit, 1);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 180);
    toast.success(`${displayName} (${selectedUnit}) added`);
  }

  function removeOne() {
    updateQuantity(product.id, selectedUnit, Math.max(0, cartQuantity - 1));
  }

  return (
    <article className="interactive-card premium-card group flex h-full min-h-[348px] flex-col overflow-hidden rounded-2xl">
      <div className="relative aspect-[5/4] overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
        {!imageReady ? (
          <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-100 via-white to-slate-100" />
        ) : null}

        <Link href={`/products/${product.id}`} className="block h-full p-3" aria-label={displayName}>
          {product.image_url ? (
            <Image
              src={product.image_url}
              alt={displayName}
              width={520}
              height={416}
              className={cn(
                "h-full w-full object-contain drop-shadow-sm transition duration-200",
                imageReady ? "opacity-100 group-hover:scale-[1.035]" : "opacity-0"
              )}
              onLoad={() => setImageReady(true)}
              onError={() => setImageReady(true)}
            />
          ) : (
            <div className="grid h-full place-items-center text-slate-300">
              <ShoppingBasket className="h-10 w-10" />
            </div>
          )}
        </Link>

        <div className="absolute left-2 top-2 flex max-w-[calc(100%-3.5rem)] flex-wrap gap-1">
          {hasOffer ? (
            <Badge variant="deal">Deal</Badge>
          ) : null}
          {isOutOfStock ? (
            <Badge variant="warning">Sold out</Badge>
          ) : isLowStock ? (
            <Badge variant="deal">Low stock</Badge>
          ) : (
            <Badge variant="fresh">Fresh</Badge>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            toggleFavoriteProduct(product.id);
            toast.success(isFavorite ? "Removed from favorites" : "Saved to favorites");
          }}
          className={cn(
            "absolute right-2 top-2 grid h-9 w-9 place-items-center rounded-full border border-white/80 bg-white text-slate-600 shadow-sm transition duration-200 active:scale-95",
            isFavorite && "bg-red-50 text-red-700"
          )}
          aria-label={isFavorite ? "Remove from favorites" : "Save to favorites"}
        >
          <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
        </button>
      </div>

      <div className="flex flex-1 flex-col p-3">
        <div className="min-h-[86px]">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-normal text-slate-500">
            <span className="truncate">{product.brand}</span>
            <span className="h-1 w-1 rounded-full bg-slate-300" />
            <span className="inline-flex items-center gap-0.5 text-amber-700">
              <Star className="h-3.5 w-3.5 fill-current" />
              {averageRating ? averageRating.toFixed(1) : "New"}
            </span>
          </div>

          <Link
            href={`/products/${product.id}`}
            className="mt-1 line-clamp-2 min-h-10 text-[15px] font-semibold leading-5 text-slate-900 transition-colors hover:text-primary-accent"
          >
            {displayName}
          </Link>

          <p className="mt-1 line-clamp-1 text-xs font-medium text-slate-500">
            {product.unitType === "weight" ? t("looseProduct") : t("packagedProduct")}
          </p>
        </div>

        <div className="mt-2 grid min-h-10 grid-cols-[1fr_auto] items-center gap-2">
          <label className="sr-only" htmlFor={`unit-${product.id}`}>
            Select unit
          </label>
          <select
            id={`unit-${product.id}`}
            value={selectedUnit}
            onChange={(event) => setSelectedUnit(event.target.value)}
          className="h-10 min-w-0 rounded-full border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-primary-accent focus:bg-white"
          >
            {product.unitOptions.map((unit) => (
              <option key={unit} value={unit}>
                {unit}
              </option>
            ))}
          </select>
          <div className="text-right">
            <p className="text-[11px] font-medium uppercase text-slate-400">{selectedUnit}</p>
            <p className="text-lg font-bold leading-5 text-primary-accent">{formatCurrency(unitPrice)}</p>
          </div>
        </div>

        <div className="mt-3 grid h-12 grid-cols-[1fr_auto] items-center gap-2 border-t border-slate-100 pt-3">
          <p className="min-w-0 truncate text-xs font-medium text-slate-500">
            {isOutOfStock ? "Unavailable now" : `${product.stock} ${t("inStock")}`}
          </p>

          {cartQuantity > 0 ? (
            <div
              className={cn(
                "grid h-11 w-[116px] grid-cols-3 overflow-hidden rounded-full bg-primary-accent text-white shadow-sm transition-transform duration-200",
                justAdded && "scale-[1.04]"
              )}
              aria-label={`${displayName} quantity in cart`}
            >
              <button type="button" onClick={removeOne} className="grid place-items-center transition active:bg-emerald-900" aria-label="Decrease quantity">
                <Minus className="h-4 w-4" />
              </button>
              <span className="grid place-items-center border-x border-white/20 text-sm font-bold tabular-nums">{cartQuantity}</span>
              <button type="button" onClick={addOne} className="grid place-items-center transition active:bg-emerald-900" aria-label="Increase quantity">
                <Plus className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={addOne}
              disabled={isOutOfStock}
              className="inline-grid h-11 min-w-[96px] grid-flow-col place-items-center gap-1.5 rounded-full bg-primary-accent px-3 text-sm font-bold uppercase text-white shadow-sm transition hover:bg-emerald-800 active:scale-95 disabled:bg-slate-200 disabled:text-slate-500"
            >
              <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
              ADD
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
