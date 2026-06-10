"use client";

import Fuse from "fuse.js";
import { Clock3, Mic, Search, ShoppingBasket, Sparkles } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/language-provider";
import { useStore } from "@/components/store-provider";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";
import { getUnitPrice } from "@/lib/units";

type SearchBarProps = {
  products: Product[];
  query: string;
  onQueryChange: (query: string) => void;
};

export function SearchBar({ onQueryChange, products, query }: SearchBarProps) {
  const { addToCart } = useStore();
  const { productName, t } = useLanguage();
  const [focused, setFocused] = useState(false);

  const results = useMemo(() => {
    if (!query.trim()) {
      return [];
    }

    return new Fuse(products, {
      keys: ["name", "category", "brand", "dietary"],
      threshold: 0.42,
      ignoreLocation: true
    }).search(query).slice(0, 5).map((result) => result.item);
  }, [products, query]);

  const trending = useMemo(
    () => Array.from(new Set(products.flatMap((product) => [product.brand, product.name.split(" ")[0]]))).filter(Boolean).slice(0, 6),
    [products]
  );

  function startVoiceSearch() {
    const browserWindow = window as Window & typeof globalThis & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!Recognition) {
      toast.error("Voice search is not supported on this device.");
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.onresult = (event) => onQueryChange(event.results[0]?.[0]?.transcript ?? "");
    recognition.start();
  }

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute left-4 top-1/2 z-10 h-5 w-5 -translate-y-1/2 text-leaf-700" />
      <Input
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => window.setTimeout(() => setFocused(false), 160)}
        className="h-12 rounded-xl border-slate-200 bg-slate-50 pl-12 pr-12 text-base font-semibold shadow-inner placeholder:text-ink/40 focus:bg-white"
        placeholder="Search for atta, oil, baby care, frozen foods..."
      />
      <button
        type="button"
        onClick={startVoiceSearch}
        className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-ink/55 hover:bg-leaf-50"
        aria-label="Voice search"
      >
        <Mic className="h-4 w-4" />
      </button>

      {focused && (results.length > 0 || !query.trim()) ? (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 overflow-hidden rounded-xl border border-slate-200 bg-white opacity-100 shadow-soft transition-opacity duration-100">
          {!query.trim() ? (
            <div className="p-4">
              <p className="inline-flex items-center gap-2 text-xs font-black uppercase text-leaf-700">
                <Sparkles className="h-4 w-4" />
                Popular searches
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {trending.map((term) => (
                  <button
                    key={term}
                    type="button"
                    onClick={() => onQueryChange(term)}
                    className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-bold text-ink hover:bg-leaf-50"
                  >
                    <Clock3 className="h-3.5 w-3.5 text-ink/45" />
                    {term}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {results.map((product) => {
            const unit = product.unitOptions[0];
            const name = productName(product.name);

            return (
              <div key={product.id} className="grid grid-cols-[1fr_auto] items-center gap-3 border-b border-zinc-100 p-3 last:border-b-0">
                <Link
                  href={`/products/${product.id}`}
                  onClick={() => setFocused(false)}
                  className="grid min-w-0 grid-cols-[52px_1fr] items-center gap-3 rounded-lg outline-none transition hover:bg-slate-50 focus-visible:ring-2 focus-visible:ring-amber-400"
                >
                  <Image src={product.image_url} alt={name} width={52} height={52} className="aspect-square rounded-md object-contain" />
                  <div className="min-w-0">
                    <p className="truncate font-black text-ink">{name}</p>
                    <p className="text-xs font-semibold text-ink/55">
                      {product.stock > 0 ? `${product.stock} ${t("inStock")}` : "Out of stock"}{" "}
                      &middot; {formatCurrency(getUnitPrice(product.price, unit, product.variantPrices))}
                    </p>
                  </div>
                </Link>
                <Button
                  type="button"
                  onClick={() => {
                    addToCart(product, unit, 1);
                    toast.success(`${name} added`);
                  }}
                  disabled={product.stock === 0}
                  className="px-2"
                  aria-label={`Add ${name}`}
                >
                  <ShoppingBasket className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

type SpeechRecognitionLike = {
  lang: string;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  start: () => void;
};
