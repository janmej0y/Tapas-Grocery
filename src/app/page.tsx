"use client";

import { useMemo, useState } from "react";
import Fuse from "fuse.js";
import { ArrowDown, BookOpen, Flower2, Mic, PackagePlus, Search, ShoppingBag } from "lucide-react";
import Image from "next/image";
import { AiAssistant } from "@/components/ai-assistant";
import { useLanguage } from "@/components/language-provider";
import { ProductCard } from "@/components/product-card";
import { useStore } from "@/components/store-provider";
import type { ProductCategory } from "@/lib/types";

const filters: Array<ProductCategory | "all"> = ["all", "grocery", "books", "cosmetics"];
const categoryIcons = {
  grocery: ShoppingBag,
  books: BookOpen,
  cosmetics: Flower2
};

export default function HomePage() {
  const { t } = useLanguage();
  const { addToCart, products } = useStore();
  const [activeFilter, setActiveFilter] = useState<ProductCategory | "all">("all");
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [preference, setPreference] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");

  const brands = useMemo(() => Array.from(new Set(products.map((product) => product.brand))).sort(), [products]);
  const preferences = useMemo(() => Array.from(new Set(products.flatMap((product) => product.dietary))).sort(), [products]);

  const filteredProducts = useMemo(() => {
    const baseProducts = activeFilter === "all" ? products : products.filter((product) => product.category === activeFilter);
    const searchResults = query.trim()
      ? new Fuse(baseProducts, {
          keys: ["name", "category", "brand", "dietary"],
          threshold: 0.38,
          ignoreLocation: true
        })
          .search(query)
          .map((result) => result.item)
      : baseProducts;

    return searchResults.filter((product) => {
      const min = minPrice ? Number(minPrice) : 0;
      const max = maxPrice ? Number(maxPrice) : Number.POSITIVE_INFINITY;
      return (
        product.price >= min &&
        product.price <= max &&
        (brand === "all" || product.brand === brand) &&
        (preference === "all" || product.dietary.includes(preference))
      );
    });
  }, [activeFilter, brand, maxPrice, minPrice, preference, products, query]);

  function startVoiceSearch() {
    const browserWindow = window as Window & typeof globalThis & {
      SpeechRecognition?: new () => SpeechRecognitionLike;
      webkitSpeechRecognition?: new () => SpeechRecognitionLike;
    };
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!Recognition) {
      return;
    }

    const recognition = new Recognition();
    recognition.lang = "en-IN";
    recognition.onresult = (event) => setQuery(event.results[0]?.[0]?.transcript ?? "");
    recognition.start();
  }

  return (
    <main>
      <section className="relative overflow-hidden bg-[#eef7ef]">
        <div className="absolute inset-y-0 right-0 hidden w-1/2 lg:block">
          <Image
            src="https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80"
            alt="Fresh grocery display"
            fill
            priority
            sizes="50vw"
            className="object-cover"
          />
        </div>
        <div className="relative mx-auto grid min-h-[540px] max-w-7xl items-center px-4 py-16 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="max-w-xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-leaf-700">{t("storeName")}</p>
            <h1 className="mt-4 text-4xl font-black leading-tight text-ink sm:text-5xl">{t("heroTitle")}</h1>
            <p className="mt-5 text-lg leading-8 text-ink/70">{t("heroSubtitle")}</p>
            <a href="#categories" className="mt-8 inline-flex items-center gap-2 rounded-md bg-leaf-600 px-5 py-3 font-bold text-white hover:bg-leaf-700">
              {t("shopNow")}
              <ArrowDown className="h-4 w-4" aria-hidden="true" />
            </a>
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div>
            <h2 className="text-3xl font-black text-ink">{t("categories")}</h2>
            <p className="mt-2 max-w-2xl text-ink/65">{t("heroSubtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => {
              const Icon = filter === "all" ? ShoppingBag : categoryIcons[filter];
              return (
                <button
                  key={filter}
                  type="button"
                  onClick={() => setActiveFilter(filter)}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-bold ${
                    activeFilter === filter ? "border-leaf-600 bg-leaf-600 text-white" : "border-black/10 bg-white text-ink hover:bg-leaf-50"
                  }`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                  {filter === "all" ? t("all") : t(filter)}
                </button>
              );
            })}
          </div>
        </div>

        <div id="product-tools" className="mt-6 scroll-mt-24 rounded-xl border border-black/10 bg-white p-3 shadow-sm lg:sticky lg:top-[73px] lg:z-30 lg:p-4">
          <div className="grid gap-3 md:grid-cols-[1.4fr_repeat(4,1fr)]">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
              <input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full rounded-md border border-black/10 py-2 pl-9 pr-3" placeholder={`${t("search")}...`} />
              <button type="button" onClick={startVoiceSearch} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-ink/55 hover:bg-leaf-50" aria-label="Voice search">
                <Mic className="h-4 w-4" />
              </button>
            </label>
            <FilterSelect label={t("brand")} value={brand} onChange={setBrand} options={brands} />
            <FilterSelect label={t("preference")} value={preference} onChange={setPreference} options={preferences} />
            <input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} className="rounded-md border border-black/10 px-3 py-2" placeholder={t("minPrice")} />
            <input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} className="rounded-md border border-black/10 px-3 py-2" placeholder={t("maxPrice")} />
          </div>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-14 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-black/10 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="rounded-md bg-marigold/20 p-2 text-ink">
              <PackagePlus className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-2xl font-black text-ink">Popular combos</h2>
              <p className="text-sm text-ink/65">Quick add weekly baskets for regular local shopping.</p>
            </div>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            {[
              { title: "Tea-time combo", ids: ["p-102", "p-103"] },
              { title: "Rice essentials", ids: ["p-101", "p-102"] },
              { title: "School ready pack", ids: ["p-201", "p-202"] }
            ].map((combo) => (
              <button
                key={combo.title}
                type="button"
                onClick={() => {
                  combo.ids
                    .map((id) => products.find((product) => product.id === id))
                    .filter(Boolean)
                    .forEach((product) => addToCart(product!, product!.unitOptions[0], 1));
                }}
                className="rounded-lg border border-black/10 bg-leaf-50 p-4 text-left font-bold hover:bg-leaf-100"
              >
                {combo.title}
                <span className="mt-1 block text-sm font-semibold text-ink/60">Add combo to cart</span>
              </button>
            ))}
          </div>
        </div>
      </section>

      <div id="assistant" className="scroll-mt-24">
        <AiAssistant />
      </div>
    </main>
  );
}

type SpeechRecognitionLike = {
  lang: string;
  onresult: (event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  start: () => void;
};

function FilterSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)} className="rounded-md border border-black/10 px-3 py-2">
      <option value="all">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}
