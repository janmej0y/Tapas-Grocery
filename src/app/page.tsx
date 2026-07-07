"use client";

import { useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import Image from "next/image";
import Link from "next/link";
import { Clock3, Download, FilterX, MapPin, Search, ShieldCheck, ShoppingBag, Smartphone, Sparkles, Tags, Truck } from "lucide-react";
import { AiAssistant } from "@/components/ai-assistant";
import { useLanguage } from "@/components/language-provider";
import { ProductCard } from "@/components/storefront/product-card";
import { SearchBar } from "@/components/storefront/search-bar";
import { Select, Input } from "@/components/ui/input";
import { useStore } from "@/components/store-provider";
import { getCategoryCounts, PRODUCTS_PER_PAGE, storeCategories } from "@/lib/catalog";
import { motion } from "framer-motion";
import { OfferModal } from "@/components/offer-modal";

export default function HomePage() {
  const { t } = useLanguage();
  const { products, customer, orders, user } = useStore();
  const [activeFilter, setActiveFilter] = useState("all");
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerType, setOfferType] = useState<"welcome" | "inactive">("welcome");

  useEffect(() => {
    if (!user) return;
    const sessionKey = `tapas-offer-shown-${user.id}`;
    const hasChecked = sessionStorage.getItem(sessionKey);
    if (hasChecked === "true") return;

    const customerOrders = orders.filter(
      (order) => customer.orderIds.includes(order.order_id) || order.customer_phone === customer.phone
    );

    if (customerOrders.length === 0) {
      setOfferType("welcome");
      setOfferOpen(true);
      sessionStorage.setItem(sessionKey, "true");
    } else {
      const sortedOrders = [...customerOrders].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      const latestOrder = sortedOrders[0];
      const diffDays = (Date.now() - new Date(latestOrder.created_at).getTime()) / (1000 * 60 * 60 * 24);

      if (diffDays > 7) {
        setOfferType("inactive");
        setOfferOpen(true);
        sessionStorage.setItem(sessionKey, "true");
      } else {
        sessionStorage.setItem(sessionKey, "true");
      }
    }
  }, [user, orders, customer]);
  const [query, setQuery] = useState("");
  const [brand, setBrand] = useState("all");
  const [preference, setPreference] = useState("all");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [currentPage, setCurrentPage] = useState(1);

  const brands = useMemo(() => Array.from(new Set(products.map((product) => product.brand))).sort(), [products]);
  const preferences = useMemo(() => Array.from(new Set(products.flatMap((product) => product.dietary))).sort(), [products]);
  const categoryCounts = useMemo(() => getCategoryCounts(products), [products]);
  const activeFilterCount = [activeFilter !== "all", brand !== "all", preference !== "all", minPrice !== "", maxPrice !== "", query.trim() !== ""]
    .filter(Boolean).length;

  const filteredProducts = useMemo(() => {
    const baseProducts = activeFilter === "all" ? products : products.filter((product) => product.brand === activeFilter);
    const searchResults = query.trim()
      ? new Fuse(baseProducts, {
          keys: ["name", "category", "brand", "dietary"],
          threshold: 0.38,
          ignoreLocation: true
        }).search(query).map((result) => result.item)
      : baseProducts;

    const filtered = searchResults.filter((product) => {
      const min = minPrice ? Number(minPrice) : 0;
      const max = maxPrice ? Number(maxPrice) : Number.POSITIVE_INFINITY;
      return (
        product.price >= min &&
        product.price <= max &&
        (brand === "all" || product.brand === brand) &&
        (preference === "all" || product.dietary.includes(preference))
      );
    });

    return [...filtered].sort((left, right) => {
      if (sortBy === "price-low") {
        return left.price - right.price;
      }

      if (sortBy === "price-high") {
        return right.price - left.price;
      }

      if (sortBy === "stock") {
        return right.stock - left.stock;
      }

      return right.stock - left.stock || left.price - right.price;
    });
  }, [activeFilter, brand, maxPrice, minPrice, preference, products, query, sortBy]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const pageProducts = filteredProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);

  useEffect(() => {
    setCurrentPage(1);
  }, [activeFilter, brand, maxPrice, minPrice, preference, query, sortBy]);

  function selectSection(filter: string) {
    setActiveFilter(filter);
    window.requestAnimationFrame(() => {
      document.getElementById("product-results")?.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    });
  }

  function clearFilters() {
    setActiveFilter("all");
    setQuery("");
    setBrand("all");
    setPreference("all");
    setMinPrice("");
    setMaxPrice("");
    setSortBy("popular");
  }

  return (
    <main className="app-bg pb-24">
      <section className="relative min-h-[620px] overflow-hidden border-b border-emerald-900/10 bg-white">
        <div className="absolute inset-0 overflow-hidden">
          <Image src="/images/hatimuri-grocery-hero.png" alt="" fill priority sizes="100vw" className="object-cover object-center brightness-[0.98]" />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/90 to-emerald-950/10" />
          <div className="absolute inset-0 soft-grid-bg opacity-35" />

          {/* Premium drift blobs */}
          <motion.div
            animate={{
              x: [0, 20, -10, 0],
              y: [0, -15, 20, 0],
              scale: [1, 1.08, 0.92, 1],
            }}
            transition={{
              duration: 14,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute left-1/3 top-10 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl"
          />
          <motion.div
            animate={{
              x: [0, -25, 15, 0],
              y: [0, 20, -15, 0],
              scale: [1, 0.93, 1.07, 1],
            }}
            transition={{
              duration: 18,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute bottom-4 right-1/4 h-80 w-80 rounded-full bg-amber-500/10 blur-3xl"
          />

          <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[#f7f8fa] to-transparent" />
        </div>
        <div className="relative mx-auto flex min-h-[620px] max-w-7xl items-center px-4 py-10 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="max-w-2xl"
          >
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white/85 px-3 py-2 text-xs font-black uppercase text-primary-accent shadow-sm backdrop-blur">
              <MapPin className="h-4 w-4" />
              Hatimuri's Digital Grocery Store
            </p>
            <h1 className="mt-4 text-4xl font-black leading-[1.02] tracking-normal text-[#111827] sm:text-6xl">
              Fresh Groceries Delivered Across Hatimuri
            </h1>
            <p className="mt-4 max-w-xl text-base leading-7 text-ink/70 sm:text-lg">
              Order daily essentials from your trusted local store with fast delivery, transparent pricing, and cash on delivery.
            </p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <a href="#product-tools" className="inline-flex items-center justify-center gap-2 rounded-full bg-[#15803d] px-5 py-3 text-sm font-black text-white shadow-soft transition hover:bg-emerald-800 active:scale-[0.98]">
                <ShoppingBag className="h-4 w-4" />
                Start shopping
              </a>
              <Link href="/more" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-black text-ink shadow-sm backdrop-blur transition hover:bg-emerald-50 active:scale-[0.98]">
                <Smartphone className="h-4 w-4" />
                Install App
              </Link>
              <a href="/downloads/tapas-grocery.apk" className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white/90 px-5 py-3 text-sm font-black text-ink shadow-sm backdrop-blur transition hover:bg-emerald-50 active:scale-[0.98]">
                <Download className="h-4 w-4" />
                Download APK
              </a>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {[
                { icon: ShieldCheck, label: "Cash On Delivery" },
                { icon: Truck, label: "Same Day Delivery" },
                { icon: Clock3, label: "Local Store Since 2019" },
                { icon: Sparkles, label: "Secure Checkout" }
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <span key={item.label} className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/82 px-3 py-2 text-xs font-black text-ink shadow-sm backdrop-blur">
                    <Icon className="h-4 w-4 text-primary-accent" />
                    {item.label}
                  </span>
                );
              })}
            </div>
          </motion.div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-7xl scroll-mt-24 px-4 py-6 sm:px-6 lg:px-8">
        <div
          id="product-tools"
          className="relative z-10 -mt-20 px-0 py-3"
        >
          <div className="glass-panel rounded-2xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-black uppercase text-primary-accent">Tapas Grocery Store</p>
                <h2 className="truncate text-xl font-black text-ink">Search, filter, add</h2>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {activeFilterCount > 0 ? (
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="inline-flex h-10 items-center gap-2 rounded-full border border-slate-200 bg-white px-3 text-sm font-black text-ink hover:bg-emerald-50"
                  >
                    <FilterX className="h-4 w-4 text-primary-accent" />
                    Clear
                  </button>
                ) : null}
                <span className="hidden rounded-full bg-emerald-50 px-3 py-2 text-sm font-black text-primary-accent sm:inline-flex">
                  {filteredProducts.length} items
                </span>
              </div>
            </div>

            <div className="mt-3">
              <SearchBar products={products} query={query} onQueryChange={setQuery} />
            </div>

            <div className="mt-3 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
              {storeCategories.map((category) => {
                const Icon = category.slug === "all" ? ShoppingBag : Tags;
                return (
                  <Link
                    key={category.slug}
                    href={category.slug === "all" ? "/#product-tools" : `/category/${category.slug}`}
                    className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black shadow-sm transition active:scale-[0.98] ${
                      category.slug === "all" ? "border-primary-accent bg-primary-accent text-white" : "border-slate-200 bg-white text-ink hover:bg-emerald-50"
                    }`}
                  >
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {category.label}
                  </Link>
                );
              })}
            </div>

            <details className="mt-3 rounded-2xl border border-slate-100 bg-white/70 px-3 py-2">
              <summary className="flex cursor-pointer list-none items-center gap-2 text-sm font-black text-ink">
                <Search className="h-4 w-4 text-primary-accent" />
                More filters {activeFilterCount > 0 ? `(${activeFilterCount} active)` : ""}
              </summary>
              <div className="mt-3 grid gap-3 md:grid-cols-5">
                <FilterSelect label={t("brand")} value={brand} onChange={setBrand} options={brands} />
                <FilterSelect label={t("preference")} value={preference} onChange={setPreference} options={preferences} />
                <Input type="number" min="0" value={minPrice} onChange={(event) => setMinPrice(event.target.value)} placeholder={t("minPrice")} />
                <Input type="number" min="0" value={maxPrice} onChange={(event) => setMaxPrice(event.target.value)} placeholder={t("maxPrice")} />
                <Select aria-label="Sort products" value={sortBy} onChange={(event) => setSortBy(event.target.value)}>
                  <option value="popular">Popular first</option>
                  <option value="price-low">Price: low to high</option>
                  <option value="price-high">Price: high to low</option>
                  <option value="stock">Most stock first</option>
                </Select>
              </div>
            </details>
          </div>
        </div>

        <div className="mt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-sm font-black uppercase text-primary-accent">Shop by aisle</p>
              <h2 className="text-2xl font-black text-ink">Find daily essentials faster</h2>
            </div>
            <p className="hidden text-sm font-bold text-ink/55 sm:block">{products.length} total products</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {categoryCounts.map((item) => (
              <Link
                key={item.slug}
                href={item.slug === "all" ? "/#product-tools" : `/category/${item.slug}`}
                className="premium-card min-h-[88px] rounded-2xl p-4 text-left text-ink transition hover:-translate-y-0.5 hover:border-emerald-200 hover:bg-emerald-50 active:scale-[0.98]"
              >
                <span className="line-clamp-2 text-sm font-black leading-5">{item.label}</span>
                <span className="mt-1 block text-xs font-bold text-ink/50">
                  {item.count} items
                </span>
              </Link>
            ))}
          </div>
        </div>

        <div className="mt-4 flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase text-primary-accent">Available now</p>
            <h2 className="text-2xl font-black text-ink">{activeFilter === "all" ? "All groceries" : activeFilter}</h2>
          </div>
          <p className="text-right text-sm font-bold text-ink/55">
            {filteredProducts.length} products
            <span className="block text-xs text-ink/45">Page {currentPage} of {totalPages}</span>
            {activeFilterCount > 0 ? <span className="block text-xs text-primary-accent">{activeFilterCount} filter{activeFilterCount === 1 ? "" : "s"} active</span> : null}
          </p>
        </div>

        <div id="product-results" className="mt-4 grid scroll-mt-28 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.length === 0
            ? Array.from({ length: 8 }).map((_, index) => (
                <div key={index} className="premium-card rounded-2xl p-4">
                  <div className="skeleton aspect-[4/3] rounded-lg" />
                  <div className="skeleton mt-4 h-5 rounded-md" />
                  <div className="skeleton mt-2 h-4 w-2/3 rounded-md" />
                  <div className="skeleton mt-5 h-10 rounded-md" />
                </div>
              ))
            : filteredProducts.length > 0 ? pageProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              )) : (
                <div className="premium-card col-span-full rounded-2xl p-8 text-center">
                  <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-emerald-50 text-primary-accent">
                    <Search className="h-5 w-5" />
                  </div>
                  <h3 className="mt-3 text-xl font-black text-ink">No matching products</h3>
                  <p className="mx-auto mt-1 max-w-md text-sm font-semibold text-ink/60">
                    Try removing a filter, checking spelling, or browsing another aisle.
                  </p>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="mt-4 inline-flex items-center justify-center rounded-full bg-primary-accent px-4 py-3 text-sm font-black text-white hover:bg-emerald-800"
                  >
                    Show all products
                  </button>
                </div>
              )}
        </div>
        {filteredProducts.length > PRODUCTS_PER_PAGE ? (
          <PaginationControls currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        ) : null}
      </section>

      <div id="assistant" className="scroll-mt-24">
        <AiAssistant />
      </div>

      <OfferModal isOpen={offerOpen} onClose={() => setOfferOpen(false)} type={offerType} />
    </main>
  );
}

function PaginationControls({ currentPage, onPageChange, totalPages }: { currentPage: number; onPageChange: (page: number) => void; totalPages: number }) {
  function goToPage(page: number) {
    onPageChange(Math.min(totalPages, Math.max(1, page)));
    window.requestAnimationFrame(() => {
      document.getElementById("product-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Product pagination">
      <button
        type="button"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-11 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        Previous
      </button>
      {Array.from({ length: totalPages }).slice(0, 7).map((_, index) => {
        const page = index + 1;
        return (
          <button
            key={page}
            type="button"
            onClick={() => goToPage(page)}
            className={`h-11 min-w-11 rounded-md border px-3 text-sm font-black ${
              page === currentPage ? "border-primary-accent bg-primary-accent text-white" : "border-slate-200 bg-white text-ink"
            }`}
          >
            {page}
          </button>
        );
      })}
      {totalPages > 7 ? <span className="px-2 text-sm font-black text-ink/45">...</span> : null}
      <button
        type="button"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-11 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-ink disabled:cursor-not-allowed disabled:opacity-40"
      >
        Next
      </button>
    </nav>
  );
}

function FilterSelect({ label, onChange, options, value }: { label: string; onChange: (value: string) => void; options: string[]; value: string }) {
  return (
    <Select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      <option value="all">{label}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </Select>
  );
}
