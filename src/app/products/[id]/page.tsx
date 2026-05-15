"use client";

import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Heart, Minus, Plus, ShoppingBasket, Star } from "lucide-react";
import { use, useState } from "react";
import toast from "react-hot-toast";
import { useStore } from "@/components/store-provider";
import { formatCurrency } from "@/lib/format";
import { getUnitPrice } from "@/lib/units";

export default function ProductDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { addToCart, customer, products, toggleFavoriteProduct } = useStore();
  const product = products.find((item) => item.id === id);
  const [selectedUnit, setSelectedUnit] = useState(product?.unitOptions[0] ?? "");
  const [quantity, setQuantity] = useState(1);

  if (!product) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-12">
        <Link href="/#categories" className="inline-flex items-center gap-2 font-bold text-leaf-700">
          <ArrowLeft className="h-4 w-4" />
          Back to products
        </Link>
        <h1 className="mt-8 text-3xl font-black text-ink">Product not found</h1>
      </main>
    );
  }

  const unitPrice = getUnitPrice(product.price, selectedUnit, product.variantPrices);
  const isFavorite = customer.favoriteProductIds.includes(product.id);
  const averageRating = product.reviews.length
    ? product.reviews.reduce((total, review) => total + review.rating, 0) / product.reviews.length
    : 0;
  const related = products.filter((item) => item.category === product.category && item.id !== product.id).slice(0, 3);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Link href="/#categories" className="inline-flex items-center gap-2 font-bold text-leaf-700">
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </Link>

      <section className="mt-6 grid gap-8 lg:grid-cols-[1fr_0.85fr]">
        <div className="overflow-hidden rounded-lg border border-black/10 bg-leaf-50">
          <Image src={product.image_url} alt={product.name} width={1100} height={820} priority className="aspect-[4/3] w-full object-cover" />
        </div>
        <div>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.16em] text-leaf-700">{product.brand}</p>
              <h1 className="mt-2 text-4xl font-black text-ink">{product.name}</h1>
              <p className="mt-2 inline-flex items-center gap-1 font-semibold text-ink/70">
                <Star className="h-4 w-4 fill-marigold text-marigold" />
                {averageRating ? averageRating.toFixed(1) : "New"} · {product.reviews.length} reviews
              </p>
            </div>
            <button
              type="button"
              onClick={() => toggleFavoriteProduct(product.id)}
              className={`rounded-full p-3 ${isFavorite ? "bg-red-50 text-red-700" : "bg-leaf-50 text-ink/60"}`}
              aria-label={isFavorite ? "Remove favorite" : "Add favorite"}
            >
              <Heart className={`h-5 w-5 ${isFavorite ? "fill-current" : ""}`} />
            </button>
          </div>

          <p className="mt-5 text-ink/70">
            {product.description ?? "Freshly listed at Tapas Grocery Store with fast local delivery from Hatimuri."}
          </p>

          <div className="mt-6 rounded-lg border border-black/10 bg-white p-4">
            <label className="block text-sm font-bold text-ink">
              {product.unitType === "weight" ? "Choose gram/kg" : "Choose pack quantity"}
              <select value={selectedUnit} onChange={(event) => setSelectedUnit(event.target.value)} className="mt-2 w-full rounded-md border border-black/10 px-3 py-2">
                {product.unitOptions.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit} - {formatCurrency(getUnitPrice(product.price, unit, product.variantPrices))}
                  </option>
                ))}
              </select>
            </label>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => setQuantity((value) => Math.max(1, value - 1))} className="rounded-md border border-black/10 p-2">
                  <Minus className="h-4 w-4" />
                </button>
                <span className="grid h-10 min-w-12 place-items-center rounded-md bg-leaf-50 px-3 font-black">{quantity}</span>
                <button type="button" onClick={() => setQuantity((value) => value + 1)} className="rounded-md border border-black/10 p-2">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <p className="text-2xl font-black text-leaf-700">{formatCurrency(unitPrice * quantity)}</p>
            </div>
            <button
              type="button"
              disabled={product.stock === 0}
              onClick={() => {
                addToCart(product, selectedUnit, quantity);
                toast.success(`${product.name} added to cart`);
              }}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md bg-leaf-600 px-4 py-3 font-black text-white hover:bg-leaf-700 disabled:bg-gray-300"
            >
              <ShoppingBasket className="h-5 w-5" />
              Add to cart
            </button>
          </div>

          <section className="mt-6">
            <h2 className="text-xl font-black text-ink">Reviews</h2>
            <div className="mt-3 space-y-3">
              {product.reviews.length ? product.reviews.map((review) => (
                <div key={review.id} className="rounded-lg border border-black/10 bg-white p-3">
                  <p className="font-bold text-ink">{review.customerName} · {review.rating}/5</p>
                  <p className="text-sm text-ink/70">{review.comment}</p>
                </div>
              )) : <p className="rounded-lg bg-leaf-50 p-3 text-sm text-ink/65">No reviews yet.</p>}
            </div>
          </section>
        </div>
      </section>

      {related.length ? (
        <section className="mt-10">
          <h2 className="text-2xl font-black text-ink">Related products</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {related.map((item) => (
              <Link key={item.id} href={`/products/${item.id}`} className="rounded-lg border border-black/10 bg-white p-3 font-bold hover:bg-leaf-50">
                {item.name}
                <span className="mt-1 block text-sm font-semibold text-leaf-700">{formatCurrency(item.price)}</span>
              </Link>
            ))}
          </div>
        </section>
      ) : null}
    </main>
  );
}
