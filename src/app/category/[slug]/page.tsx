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
    <main className="bg-slate-50 pb-24">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Link href="/#categories" className="inline-flex items-center gap-2 text-sm font-black text-leaf-700 hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to all products
          </Link>
          <div className="mt-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-black uppercase text-leaf-700">Category</p>
              <h1 className="text-3xl font-black text-ink sm:text-4xl">{categoryLabel}</h1>
              <p className="mt-1 text-sm font-semibold text-ink/60">{filteredProducts.length} products available</p>
            </div>
            <Select aria-label="Sort products" value={sortBy} onChange={(event) => setSortBy(event.target.value)} className="sm:max-w-56">
              <option value="popular">Popular first</option>
              <option value="price-low">Price: low to high</option>
              <option value="price-high">Price: high to low</option>
            </Select>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none]">
            {storeCategories.map((category) => (
              <Link
                key={category.slug}
                href={category.slug === "all" ? "/" : `/category/${category.slug}`}
                className={`inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-4 py-2 text-sm font-black transition ${
                  category.slug === slug ? "border-leaf-600 bg-leaf-600 text-white" : "border-slate-200 bg-white text-ink hover:bg-leaf-50"
                }`}
              >
                <Tags className="h-4 w-4" />
                {category.label}
              </Link>
            ))}
          </div>

          <div className="mt-4">
            <SearchBar products={categoryProducts} query={query} onQueryChange={setQuery} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-5 sm:px-6 lg:px-8">
        <div className="flex items-end justify-between gap-3">
          <div>
            <p className="text-sm font-black uppercase text-leaf-700">Showing now</p>
            <h2 className="text-2xl font-black text-ink">{categoryLabel}</h2>
          </div>
          <p className="text-right text-sm font-bold text-ink/55">
            Page {currentPage} of {totalPages}
            <span className="block text-xs">{filteredProducts.length} products</span>
          </p>
        </div>

        <div id="category-results" className="mt-4 grid scroll-mt-24 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {pageProducts.length ? pageProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          )) : (
            <div className="col-span-full rounded-lg border border-slate-200 bg-white p-6 text-center shadow-sm">
              <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-leaf-50 text-leaf-700">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="mt-3 text-xl font-black text-ink">No products found</h3>
              <p className="mt-1 text-sm font-semibold text-ink/60">Try another search term in this category.</p>
            </div>
          )}
        </div>

        {filteredProducts.length > PRODUCTS_PER_PAGE ? (
          <CategoryPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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
    <nav className="mt-6 flex flex-wrap items-center justify-center gap-2" aria-label="Category pagination">
      <button type="button" onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="h-11 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-ink disabled:opacity-40">
        Previous
      </button>
      {Array.from({ length: totalPages }).slice(0, 7).map((_, index) => {
        const page = index + 1;
        return (
          <button key={page} type="button" onClick={() => goToPage(page)} className={`h-11 min-w-11 rounded-md border px-3 text-sm font-black ${page === currentPage ? "border-leaf-600 bg-leaf-600 text-white" : "border-slate-200 bg-white text-ink"}`}>
            {page}
          </button>
        );
      })}
      {totalPages > 7 ? <span className="px-2 text-sm font-black text-ink/45">...</span> : null}
      <button type="button" onClick={() => goToPage(currentPage + 1)} disabled={currentPage === totalPages} className="h-11 rounded-md border border-slate-200 bg-white px-4 text-sm font-black text-ink disabled:opacity-40">
        Next
      </button>
    </nav>
  );
}
