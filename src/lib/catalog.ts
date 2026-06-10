import type { Product } from "@/lib/types";

export const PRODUCTS_PER_PAGE = 20;

export const storeCategories = [
  { slug: "all", label: "All" },
  { slug: "kitchen-items", label: "Kitchen Items" },
  { slug: "beauty-products", label: "Beauty Products" },
  { slug: "food", label: "Food" },
  { slug: "household", label: "Household" },
  { slug: "tobacco", label: "Tobacco" }
] as const;

export type StoreCategorySlug = (typeof storeCategories)[number]["slug"];

export function getStoreCategory(product: Product): StoreCategorySlug {
  const brand = product.brand.toLowerCase();
  const name = product.name.toLowerCase();

  if (brand.includes("tobacco") || name.includes("cigarette") || name.includes("bidi") || name.includes("khaini") || name.includes("zarda")) {
    return "tobacco";
  }

  if (brand.includes("personal") || brand.includes("baby") || product.category === "cosmetics") {
    return "beauty-products";
  }

  if (
    brand.includes("household") ||
    brand.includes("puja") ||
    brand.includes("stationery") ||
    brand.includes("pet")
  ) {
    return "household";
  }

  if (
    brand.includes("oils") ||
    brand.includes("flour") ||
    brand.includes("rice") ||
    brand.includes("pulses") ||
    brand.includes("nuts") ||
    brand.includes("sugar") ||
    brand.includes("sauces")
  ) {
    return "kitchen-items";
  }

  return "food";
}

export function getCategoryLabel(slug: string) {
  return storeCategories.find((category) => category.slug === slug)?.label ?? "All";
}

export function filterProductsByStoreCategory(products: Product[], slug: string) {
  if (slug === "all") {
    return products;
  }

  return products.filter((product) => getStoreCategory(product) === slug);
}

export function getCategoryCounts(products: Product[]) {
  return storeCategories.map((category) => ({
    ...category,
    count: category.slug === "all" ? products.length : filterProductsByStoreCategory(products, category.slug).length
  }));
}
