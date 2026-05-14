"use client";

import { Minus, Plus, ShoppingBasket, Star } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/language-provider";
import { useStore } from "@/components/store-provider";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";
import { getUnitPrice } from "@/lib/units";

export function ProductCard({ product }: { product: Product }) {
  const { t } = useLanguage();
  const { addProductReview, addToCart, customer } = useStore();
  const [isChoosing, setIsChoosing] = useState(false);
  const [selectedUnit, setSelectedUnit] = useState(product.unitOptions[0]);
  const [quantity, setQuantity] = useState(1);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const linePrice = getUnitPrice(product.price, selectedUnit, product.variantPrices) * quantity;
  const averageRating =
    product.reviews.length > 0
      ? product.reviews.reduce((total, review) => total + review.rating, 0) / product.reviews.length
      : 0;

  function submitReview() {
    if (!customer.isPhoneVerified) {
      toast.error("Verify phone before reviewing.");
      return;
    }

    if (!reviewComment.trim()) {
      toast.error("Write a review comment first.");
      return;
    }

    addProductReview(product.id, {
      customerName: customer.name,
      rating: reviewRating,
      comment: reviewComment.trim()
    });
    setReviewComment("");
    toast.success("Review posted");
  }

  return (
    <article className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm">
      <button type="button" onClick={() => setIsChoosing((value) => !value)} className="block w-full text-left" aria-label={`Choose ${product.name}`}>
        <div className="aspect-[4/3] overflow-hidden bg-leaf-50">
          <Image
            src={product.image_url}
            alt={product.name}
            width={640}
            height={480}
            className="h-full w-full object-cover transition duration-300 hover:scale-105"
          />
        </div>
      </button>
      <div className="space-y-4 p-4">
        <div>
          <div className="flex items-start justify-between gap-3">
            <button type="button" onClick={() => setIsChoosing((value) => !value)} className="text-left text-lg font-bold text-ink hover:text-leaf-700">
              {product.name}
            </button>
            <span className="rounded-full bg-leaf-50 px-2 py-1 text-xs font-bold text-leaf-700">{product.brand}</span>
          </div>
          <p className="mt-1 text-sm text-ink/65">
            {product.stock} {t("inStock")} · {product.unitType === "weight" ? "Gram/Kg" : "Packaged"}
          </p>
          <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-ink/70">
            <Star className="h-4 w-4 fill-marigold text-marigold" />
            {averageRating ? averageRating.toFixed(1) : "New"} · {product.reviews.length} reviews
          </p>
          {product.dietary.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1">
              {product.dietary.map((tag) => (
                <span key={tag} className="rounded-full bg-marigold/15 px-2 py-1 text-xs font-semibold text-ink">
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </div>

        {isChoosing ? (
          <div className="rounded-lg bg-leaf-50 p-3">
            <label className="block text-sm font-bold text-ink">
              {product.unitType === "weight" ? "Select weight" : "Select quantity pack"}
              <select value={selectedUnit} onChange={(event) => setSelectedUnit(event.target.value)} className="mt-2 w-full rounded-md border border-black/10 bg-white px-3 py-2">
                {product.unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit} - {formatCurrency(getUnitPrice(product.price, unit, product.variantPrices))}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="rounded-md border border-black/10 bg-white p-2" aria-label="Decrease product quantity">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="grid h-9 min-w-10 place-items-center rounded-md bg-white px-3 text-sm font-bold">{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => value + 1)} className="rounded-md border border-black/10 bg-white p-2" aria-label="Increase product quantity">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="font-black text-leaf-700">{formatCurrency(linePrice)}</p>
            </div>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <p className="text-xl font-black text-leaf-700">{formatCurrency(getUnitPrice(product.price, selectedUnit, product.variantPrices))}</p>
          <button
            type="button"
            onClick={() => {
              addToCart(product, selectedUnit, quantity);
              toast.success(`${product.name} (${selectedUnit}) added to cart`);
            }}
            disabled={product.stock === 0}
            className="inline-flex items-center gap-2 rounded-md bg-leaf-600 px-3 py-2 text-sm font-bold text-white hover:bg-leaf-700 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-600"
          >
            <ShoppingBasket className="h-4 w-4" aria-hidden="true" />
            {t("addToCart")}
          </button>
        </div>

        {isChoosing ? (
          <div className="rounded-lg border border-black/10 p-3">
            <div className="flex items-center gap-2">
              <select value={reviewRating} onChange={(event) => setReviewRating(Number(event.target.value))} className="rounded-md border border-black/10 px-2 py-2 text-sm">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <option key={rating} value={rating}>
                    {rating} star
                  </option>
                ))}
              </select>
              <input value={reviewComment} onChange={(event) => setReviewComment(event.target.value)} className="min-w-0 flex-1 rounded-md border border-black/10 px-3 py-2 text-sm" placeholder="Write a quick review" />
            </div>
            <button type="button" onClick={submitReview} className="mt-2 w-full rounded-md bg-ink px-3 py-2 text-sm font-bold text-white hover:bg-leaf-700">
              Submit review
            </button>
          </div>
        ) : null}
      </div>
    </article>
  );
}
