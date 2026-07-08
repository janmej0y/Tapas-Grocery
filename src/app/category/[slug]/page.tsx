"use client";

import Link from "next/link";
import { ArrowLeft, Search, Tags } from "lucide-react";
import { use, useEffect, useMemo, useState } from "react";
import Fuse from "fuse.js";
import { ProductCard } from "@/components/storefront/product-card";
import { SearchBar } from "@/components/storefront/search-bar";
import { Select } from "@/components/ui/input";
import { useStore } from "@/components/store-provider";
import { filterProductsByStoreCategory, getCategoryLabel, PRODUCTS_PER_PAGE, storeCategories } from "@/lib/catalog";
import { motion, AnimatePresence } from "framer-motion";

export default function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = use(params);
  const { products } = useStore();
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("popular");
  const [currentPage, setCurrentPage] = useState(1);
  const categoryProducts = useMemo(() => filterProductsByStoreCategory(products, slug), [products, slug]);
  const filteredProducts = useMemo(() => {
    const searched = query.trim()
      ? new Fuse(categoryProducts, {
          keys: ["name", "category", "brand", "dietary"],
          threshold: 0.38,
          ignoreLocation: true
        }).search(query).map((result) => result.item)
      : categoryProducts;

    return [...searched].sort((left, right) => {
      if (sortBy === "price-low") {
        return left.price - right.price;
      }

      if (sortBy === "price-high") {
        return right.price - left.price;
      }

      return right.stock - left.stock || left.price - right.price;
    });
  }, [categoryProducts, query, sortBy]);
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PRODUCTS_PER_PAGE));
  const pageProducts = filteredProducts.slice((currentPage - 1) * PRODUCTS_PER_PAGE, currentPage * PRODUCTS_PER_PAGE);
  const categoryLabel = getCategoryLabel(slug);

  useEffect(() => {
    setCurrentPage(1);
  }, [query, sortBy, slug]);

  return (
    <main className="app-bg pb-24 min-h-screen">
      <section className="relative overflow-hidden border-b border-slate-200/80 bg-white/70 backdrop-blur-md">
        {/* Subtle decorative blob */}
        <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full bg-leaf-500/5 blur-2xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 h-32 w-32 rounded-full bg-amber-500/5 blur-2xl pointer-events-none" />
        <div className="absolute inset-0 soft-grid-bg opacity-[0.25] pointer-events-none" />

        <div className="relative mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Link href="/#categories" className="inline-flex items-center gap-2 text-sm font-semibold text-primary-accent hover:text-leaf-800 transition-colors group">
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              Back to all products
            </Link>
          </motion.div>

          <div className="mt-5 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.05 }}
            >
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-slate-400" />
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Category</p>
              </div>
              <h1 className="mt-1 text-3xl font-bold tracking-tight text-heading sm:text-4xl">{categoryLabel}</h1>
              <p className="mt-1.5 text-sm font-medium text-slate-500">
                <span className="font-bold text-primary-accent">{filteredProducts.length}</span> products available
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="w-full sm:max-w-56"
            >
              <Select aria-label="Sort products" value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="rounded-full shadow-card bg-white border-slate-200/80 text-sm font-semibold focus:border-primary-accent">
                <option value="popular">Popular first</option>
                <option value="price-low">Price: low to high</option>
                <option value="price-high">Price: high to low</option>
              </Select>
            </motion.div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.15 }}
            className="mt-6 flex gap-2 overflow-x-auto pb-2 [scrollbar-width:none] -mx-4 px-4 sm:mx-0 sm:px-0"
          >
            {storeCategories.map((category) => {
              const isActive = category.slug === slug;
              return (
                <Link
                  key={category.slug}
                  href={category.slug === "all" ? "/" : `/category/${category.slug}`}
                  className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold shadow-card transition-all duration-200 ease-out active:scale-95 ${
                    isActive
                      ? "border-primary-accent bg-primary-accent text-white shadow-elevated"
                      : "border-slate-200 bg-white text-slate-700 hover:text-primary-accent hover:border-leaf-200 hover:bg-leaf-50/30"
                  }`}
                >
                  <Tags className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                  {category.label}
                </Link>
              );
            })}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            className="mt-5"
          >
            <SearchBar products={categoryProducts} query={query} onQueryChange={setQuery} />
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="flex items-end justify-between gap-3 border-b border-slate-100 pb-4"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Showing now</p>
            <h2 className="text-xl font-bold text-heading mt-0.5">{categoryLabel} Selection</h2>
          </div>
          <p className="text-right text-xs font-medium text-slate-400">
            Page <span className="font-semibold text-slate-600">{currentPage}</span> of <span className="font-semibold text-slate-600">{totalPages}</span>
            <span className="block text-[10px] uppercase font-semibold tracking-wider text-slate-400/80 mt-0.5">{filteredProducts.length} items total</span>
          </p>
        </motion.div>

        <motion.div 
          layout
          id="category-results" 
          className="mt-6 grid scroll-mt-24 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
        >
          <AnimatePresence mode="popLayout">
            {pageProducts.length ? pageProducts.map((product) => (
              <motion.div
                layout
                key={product.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3 }}
              >
                <ProductCard product={product} />
              </motion.div>
            )) : (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel col-span-full rounded-2xl p-12 text-center"
              >
                <div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-slate-100 text-slate-500">
                  <Search className="h-6 w-6" />
                </div>
                <h3 className="mt-4 text-xl font-bold text-heading">No products found</h3>
                <p className="mt-2 text-sm font-medium text-slate-500 max-w-sm mx-auto">We couldn't find any products in "{categoryLabel}" matching your search. Try another search term!</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {filteredProducts.length > PRODUCTS_PER_PAGE ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <CategoryPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
          </motion.div>
        ) : null}
      </section>
    </main>
  );
}

function CategoryPagination({ currentPage, onPageChange, totalPages }: { currentPage: number; onPageChange: (page: number) => void; totalPages: number }) {
  function goToPage(page: number) {
    onPageChange(Math.min(totalPages, Math.max(1, page)));
    window.requestAnimationFrame(() => {
      document.getElementById("category-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  return (
    <nav className="mt-10 flex flex-wrap items-center justify-center gap-2" aria-label="Category pagination">
      <button
        type="button"
        onClick={() => goToPage(currentPage - 1)}
        disabled={currentPage === 1}
        className="h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-heading shadow-card transition-all duration-200 ease-out hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
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
            className={`h-11 min-w-11 rounded-full border px-4 text-sm font-semibold transition-all duration-200 ease-out active:scale-95 ${
              page === currentPage
                ? "border-primary-accent bg-primary-accent text-white shadow-card"
                : "border-slate-200 bg-white text-heading hover:bg-slate-50"
            }`}
          >
            {page}
          </button>
        );
      })}
      {totalPages > 7 ? <span className="px-2 text-sm font-semibold text-slate-400">...</span> : null}
      <button
        type="button"
        onClick={() => goToPage(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="h-11 rounded-full border border-slate-200 bg-white px-5 text-sm font-semibold text-heading shadow-card transition-all duration-200 ease-out hover:bg-slate-50 active:scale-95 disabled:opacity-40 disabled:pointer-events-none"
      >
        Next
      </button>
    </nav>
  );
}
