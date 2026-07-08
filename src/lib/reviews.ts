import type { Product, ProductReview } from "@/lib/types";

const REVIEWER_NAMES = [
  "Ananya Roy", "Debashish Mondal", "Priya Sen", "Arindam Ghosh", "Sneha Das",
  "Rajib Chatterjee", "Moumita Saha", "Suman Banerjee", "Tanushree Pal", "Abir Basu",
  "Ritu Bhattacharya", "Kaushik Dutta", "Ipsita Mukherjee", "Sourav Adhikari", "Nabanita Bose",
  "Pritam Chakraborty", "Sohini Karmakar", "Amit Halder", "Riya Chowdhury", "Bikram Naskar",
  "Madhumita Sarkar", "Tapas Bagchi", "Sudipa Ray", "Anirban Sinha", "Payel Guha"
];

const FRESH_PRODUCE_COMMENTS = [
  { rating: 5, text: "Very fresh, delivered the same morning. Better quality than what I usually get from the local market." },
  { rating: 4, text: "Good quality overall, just wish the pack size was a little bigger for the price." },
  { rating: 5, text: "Consistently fresh every time I order. This is now my go-to for weekly groceries." },
  { rating: 3, text: "Quality was fine but one or two pieces were slightly bruised. Rest was good." },
  { rating: 4, text: "Nice and fresh, packed well so nothing was damaged during delivery." }
];

const STAPLE_GROCERY_COMMENTS = [
  { rating: 5, text: "Good quality and fair pricing. Have been ordering this every month without any issues." },
  { rating: 4, text: "Does the job well. Packaging could be a bit more sturdy but the product itself is solid." },
  { rating: 5, text: "Exactly like what we get from the trusted local store, but delivered to my door. Great value." },
  { rating: 4, text: "Quality is consistent order after order. No complaints." },
  { rating: 3, text: "Decent product for the price, though I've had slightly better quality from other brands before." }
];

const SPICE_OIL_COMMENTS = [
  { rating: 5, text: "Very aromatic, real Bengali cooking taste. This is exactly what my mother used to buy." },
  { rating: 4, text: "Good quality, strong flavor. A little pricier than the market but worth it for the convenience." },
  { rating: 5, text: "Perfect for daily cooking, no artificial smell or aftertaste." },
  { rating: 4, text: "Works well in curries. Packaging was leak-proof which I appreciated." }
];

const SNACK_BISCUIT_COMMENTS = [
  { rating: 4, text: "Kids love it, and it's a good quick snack option. Would buy again." },
  { rating: 5, text: "Tastes fresh, not stale at all like some online orders can be. Great with evening tea." },
  { rating: 4, text: "Good taste, reasonably priced compared to nearby supermarket." },
  { rating: 3, text: "Taste is fine but I received it a little close to the expiry date." }
];

const HOUSEHOLD_COMMENTS = [
  { rating: 5, text: "Works very well, exactly as expected. Delivery was quick too." },
  { rating: 4, text: "Good quality product, does what it says. Will reorder when it runs out." },
  { rating: 4, text: "Effective and lasts a while. Slightly bulky packaging but no real issue." },
  { rating: 5, text: "Very satisfied, this has replaced my usual supermarket purchase now." }
];

const PERSONAL_CARE_COMMENTS = [
  { rating: 5, text: "Gentle on skin, no irritation. Genuinely good quality for the price." },
  { rating: 4, text: "Works well, packaging was intact on arrival. Would recommend." },
  { rating: 4, text: "Good product, my usual brand, glad it's available here too." },
  { rating: 3, text: "Product is fine, but I expected slightly better packaging for a personal care item." }
];

const DAIRY_BAKERY_COMMENTS = [
  { rating: 5, text: "Fresh and well packed, arrived cold and in good condition." },
  { rating: 4, text: "Good taste and freshness. Slightly expensive but convenient for quick delivery." },
  { rating: 5, text: "Kids finished it in a day, that says it all. Will order again." },
  { rating: 4, text: "Quality was good, consistent with what I usually buy locally." }
];

const GENERIC_COMMENTS = [
  { rating: 4, text: "Good product, arrived on time and as described." },
  { rating: 5, text: "Very satisfied with the quality and quick delivery from Tapas Grocery Store." },
  { rating: 4, text: "Does the job well, fair pricing compared to nearby shops." },
  { rating: 3, text: "Decent quality, nothing exceptional but nothing wrong either." },
  { rating: 5, text: "Great value for money, will definitely reorder." }
];

function pickCommentPool(product: Product): typeof GENERIC_COMMENTS {
  const brand = product.brand.toLowerCase();
  const name = product.name.toLowerCase();

  if (brand.includes("oils") || brand.includes("spices")) {
    return SPICE_OIL_COMMENTS;
  }
  if (brand.includes("dairy") || brand.includes("bakery")) {
    return DAIRY_BAKERY_COMMENTS;
  }
  if (brand.includes("biscuit") || brand.includes("snack")) {
    return SNACK_BISCUIT_COMMENTS;
  }
  if (brand.includes("household") || brand.includes("puja") || brand.includes("pet")) {
    return HOUSEHOLD_COMMENTS;
  }
  if (brand.includes("personal") || brand.includes("baby") || product.category === "cosmetics") {
    return PERSONAL_CARE_COMMENTS;
  }
  if (name.includes("vegetable") || name.includes("fruit") || product.unitType === "weight") {
    return FRESH_PRODUCE_COMMENTS;
  }
  if (brand.includes("rice") || brand.includes("pulses") || brand.includes("flour") || brand.includes("sugar")) {
    return STAPLE_GROCERY_COMMENTS;
  }

  return GENERIC_COMMENTS;
}

// Simple deterministic hash so the same product always gets the same
// reviewers/ratings across reloads, instead of random reviews reshuffling
// every time the app restarts.
function hashSeed(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash;
}

export function buildProductReviews(product: Product): ProductReview[] {
  const seed = hashSeed(product.id);
  const pool = pickCommentPool(product);
  const reviewCount = 2 + (seed % 3); // 2 to 4 reviews per product

  return Array.from({ length: reviewCount }, (_, index) => {
    const commentIndex = (seed + index * 7) % pool.length;
    const nameIndex = (seed + index * 13) % REVIEWER_NAMES.length;
    const comment = pool[commentIndex];
    const daysAgo = 3 + ((seed + index * 5) % 90);

    return {
      id: `${product.id}-review-${index + 1}`,
      productId: product.id,
      customerName: REVIEWER_NAMES[nameIndex],
      rating: comment.rating,
      comment: comment.text,
      created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
    };
  });
}
