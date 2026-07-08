"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Heart, Minus, Plus, ShoppingBasket, Star } from "lucide-react";
import { use, useState } from "react";
import toast from "react-hot-toast";
import { useLanguage } from "@/components/language-provider";
import { useStore } from "@/components/store-provider";
import { formatCurrency } from "@/lib/format";
import { getDefaultMeasuredUnit, getMeasuredUnitOptions, getUnitPrice } from "@/lib/units";
import { ProductCard } from "@/components/storefront/product-card";

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { productName, t } = useLanguage();
  const { addToCart, customer, products, toggleFavoriteProduct } = useStore();
  const product = products.find((item) => item.id === id);
  const [selectedUnit, setSelectedUnit] = useState(product?.unitOptions[0] ?? "");
  const [quantity, setQuantity] = useState(1);
  const [customAmount, setCustomAmount] = useState("");
  const [customMeasureUnit, setCustomMeasureUnit] = useState(getDefaultMeasuredUnit(product?.unitOptions[0] ?? ""));
  const [imageFailed, setImageFailed] = useState(false);

  if (!product) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <Link href="/#categories" className="inline-flex items-center gap-2 font-semibold text-primary-accent hover:underline">
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
        <h1 className="mt-8 text-3xl font-bold text-heading">Product not found</h1>
      </main>
    );
  }

  const unitPrice = getUnitPrice(product.price, selectedUnit, product.variantPrices);
  const customAmountValue = Number(customAmount);
  const hasCustomAmount = Number.isFinite(customAmountValue) && customAmountValue > 0;
  const customUnitOptions = getMeasuredUnitOptions(selectedUnit);
  const customUnitLabel = customMeasureUnit === "number" ? selectedUnit : `${customAmountValue} ${customMeasureUnit}`;
  const orderUnit = hasCustomAmount ? customUnitLabel : selectedUnit;
  const orderQuantity = hasCustomAmount && customMeasureUnit === "number"
    ? Math.min(product.stock, Math.max(1, Math.floor(customAmountValue)))
    : product.unitType === "weight"
      ? 1
      : quantity;
  const displayedUnitPrice = hasCustomAmount && customMeasureUnit !== "number"
    ? getUnitPrice(product.price, customUnitLabel, product.variantPrices)
    : unitPrice;
  const displayedTotal = displayedUnitPrice * orderQuantity;
  const isFavorite = customer.favoriteProductIds.includes(product.id);
  const averageRating = product.reviews.length
    ? product.reviews.reduce((total, review) => total + review.rating, 0) / product.reviews.length
    : 0;
  const related = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 4);

  return (
    <main className="app-bg min-h-screen px-4 py-8 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/#categories" className="inline-flex items-center gap-2 font-semibold text-primary-accent hover:text-leaf-800 transition-colors group">
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          Back to products
        </Link>

        <section className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="premium-card relative overflow-hidden rounded-2xl p-6 flex items-center justify-center bg-gradient-to-br from-slate-50 via-white to-slate-50">
            {product.image_url && !imageFailed ? (
              <Image
                src={product.image_url}
                alt={product.name}
                width={1100}
                height={820}
                priority
                className="max-h-[500px] w-full object-contain drop-shadow-sm"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <div className="grid h-full min-h-[300px] w-full place-items-center text-slate-300">
                <ShoppingBasket className="h-14 w-14" />
              </div>
            )}
          </div>
          <div className="flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{product.brand}</p>
                  <h1 className="mt-2 text-3xl sm:text-4xl font-bold text-heading leading-tight">{productName(product.name)}</h1>
                  <p className="mt-2.5 inline-flex items-center gap-1 font-medium text-slate-500">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                    <span className="text-heading font-semibold">{averageRating ? averageRating.toFixed(1) : "New"}</span>
                    <span>·</span>
                    <span>{product.reviews.length} reviews</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    toggleFavoriteProduct(product.id);
                    toast.success(isFavorite ? "Removed from favorites" : "Saved to favorites");
                  }}
                  className={`grid h-9 w-9 place-items-center rounded-full transition-colors shadow-card active:scale-95 ${
                    isFavorite ? "bg-red-50 text-red-700 border border-red-100" : "bg-white border border-slate-200 text-slate-400 hover:text-red-500"
                  }`}
                  aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
                >
                  <Heart className={`h-4 w-4 ${isFavorite ? "fill-current" : ""}`} />
                </button>
              </div>

              <p className="mt-6 text-base font-medium leading-relaxed text-slate-500">
                {product.description ?? "Freshly listed at Tapas Grocery Store with fast local delivery from Hatimuri."}
              </p>

              <div className="premium-card mt-6 rounded-2xl p-5 bg-white/80 backdrop-blur-sm">
                <label className="block text-sm font-semibold text-heading">
                  {product.unitType === "weight" ? t("selectWeight") : t("selectPack")}
                  <select
                    value={selectedUnit}
                    onChange={(event) => {
                      const nextUnit = event.target.value;
                      setSelectedUnit(nextUnit);
                      setCustomMeasureUnit(getDefaultMeasuredUnit(nextUnit));
                      setCustomAmount("");
                    }}
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-semibold outline-none transition focus:border-primary-accent focus:bg-white"
                  >
                    {product.unitOptions.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit} - {formatCurrency(getUnitPrice(product.price, unit, product.variantPrices))}
                      </option>
                    ))}
                  </select>
                </label>
                {product.unitType === "weight" ? <p className="mt-3 text-xs font-medium text-slate-400">{t("pricedByWeight")}</p> : null}

                <div className="mt-5 rounded-xl border border-slate-100 bg-slate-50/60 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-heading">Custom quantity</p>
                      <p className="text-xs font-medium text-slate-500 mt-0.5">Enter mg, ml, kg, liter, or item count.</p>
                    </div>
                    {hasCustomAmount ? (
                      <button
                        type="button"
                        onClick={() => setCustomAmount("")}
                        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-heading hover:bg-slate-50"
                      >
                        Reset
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-3 grid grid-cols-[1fr_116px] gap-2">
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="0.01"
                      value={customAmount}
                      onChange={(event) => setCustomAmount(event.target.value)}
                      placeholder={customMeasureUnit === "number" ? "e.g. 3" : customMeasureUnit === "ml" ? "e.g. 500" : "e.g. 250"}
                      className="h-12 min-w-0 rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-heading outline-none focus:border-primary-accent"
                    />
                    <select
                      value={customMeasureUnit}
                      onChange={(event) => {
                        setCustomMeasureUnit(event.target.value);
                        setCustomAmount("");
                      }}
                      className="h-12 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-heading outline-none focus:border-primary-accent"
                    >
                      {customUnitOptions.map((unit) => (
                        <option key={unit} value={unit}>
                          {unit}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-100/80 px-4 py-2.5">
                    <span className="text-xs font-semibold uppercase text-slate-400 tracking-wider">{hasCustomAmount ? orderUnit : "Using selected pack"}</span>
                    <span className="text-lg font-bold text-primary-accent">{formatCurrency(displayedTotal)}</span>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-between gap-4 border-t border-slate-100 pt-4">
                  {product.unitType === "package" && !(hasCustomAmount && customMeasureUnit !== "number") ? (
                    <div className="flex items-center gap-2">
                      <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="rounded-full border border-slate-200 p-2 bg-white hover:bg-slate-50 active:scale-95 transition-all duration-200 ease-out">
                        <Minus className="h-4 w-4 text-heading" />
                      </button>
                      <span className="grid h-10 min-w-12 place-items-center rounded-full bg-primary-accent/10 px-3 font-bold text-primary-accent tabular-nums">{quantity}</span>
                      <button type="button" onClick={() => setQuantity((value) => Math.min(30, value + 1))} className="rounded-full border border-slate-200 p-2 bg-white hover:bg-slate-50 active:scale-95 transition-all duration-200 ease-out">
                        <Plus className="h-4 w-4 text-heading" />
                      </button>
                    </div>
                  ) : (
                    <span className="rounded-full bg-primary-accent/10 border border-primary-accent/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-primary-accent">{orderUnit}</span>
                  )}
                  <div className="text-right">
                    <p className="text-xs font-semibold uppercase text-slate-400">Total Price</p>
                    <p className="text-2xl font-black text-primary-accent">{formatCurrency(displayedTotal)}</p>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={product.stock === 0}
                  onClick={() => {
                    addToCart(product, orderUnit, orderQuantity);
                    toast.success(`${productName(product.name)} added to cart`);
                  }}
                  className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary-accent px-4 py-3.5 text-base font-bold uppercase text-white shadow-elevated hover:bg-leaf-800 transition active:scale-98 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none"
                >
                  <ShoppingBasket className="h-5 w-5" />
                  {t("addToCart")}
                </button>
              </div>
            </div>

            <section className="mt-8">
              <h2 className="text-lg font-semibold text-heading">Reviews & Feedback</h2>
              <div className="mt-3 space-y-3">
                {product.reviews.length ? product.reviews.map((review) => (
                  <div key={review.id} className="premium-card rounded-2xl p-4 bg-white/70">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-heading text-sm">{review.customerName}</span>
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
                      <span className="inline-flex items-center gap-0.5 text-xs font-semibold text-amber-700">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {review.rating}/5
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-500 leading-relaxed">{review.comment}</p>
                  </div>
                )) : (
                  <div className="rounded-2xl border border-dashed border-slate-200 p-4 text-center">
                    <p className="text-sm font-medium text-slate-400">No reviews yet. Be the first to share your experience!</p>
                  </div>
                )}
              </div>
            </section>
          </div>
        </section>

        {related.length ? (
          <section className="mt-16">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-2xl font-bold text-heading">Related Products</h2>
              <p className="text-xs font-medium text-slate-400 mt-0.5">Explore similar high-quality fresh options</p>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((item) => (
                <ProductCard key={item.id} product={item} />
              ))}
            </div>
          </section>
        ) : null}
      </div>
    </main>
  );
}
